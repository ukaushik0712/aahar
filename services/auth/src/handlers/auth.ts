import { hash, randomInt, randomUUIDv7, timingSafeEqual } from 'node:crypto';
import {
	AuthService,
	RefreshTokenResponseSchema,
	RequestOtpResponseSchema,
	UserRole,
	UserSchema,
	VerifyOtpResponseSchema
} from '@aahar/proto/auth/v1';
import { isValidPhoneNumber } from '@aahar/util/util';
import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import { Code, ConnectError, type ConnectRouter } from '@connectrpc/connect';
import { sql } from 'kysely';
import { auth } from '../config.js';
import { db } from '../db/database.js';
import { redis } from '../redis/client.js';
import { generateAccessToken, generateRefreshToken } from '../services/token.service.js';

export default (router: ConnectRouter) =>
	router.service(AuthService, {
		async requestOtp(req) {
			const { phoneNumber } = req;
			if (!isValidPhoneNumber(phoneNumber)) throw new ConnectError('Invalid phone number.', Code.InvalidArgument);

			const throttleStr = await redis.get(`otp:throttle:${phoneNumber}`);
			if (throttleStr && Number(throttleStr) >= auth.maxThrottleCount)
				throw new ConnectError('OTP service throttled on this phone number.', Code.ResourceExhausted);

			const cooldown = await redis.set(`otp:cooldown:${phoneNumber}`, '1', 'EX', auth.otpCooldownSeconds, 'NX');
			if (!cooldown) throw new ConnectError('You are on cooldown', Code.ResourceExhausted); // if the key already exists (no operation will be performed), cooldown will be false

			const otp = randomInt(100000, 1000000);

			console.log(`generated otp: ${otp}`); // TODO: change in prod

			const dispatchPipeline = redis
				.pipeline()
				.hset(`otp:${phoneNumber}`, {
					code: otp,
					attempts: 0
				})
				.expire(`otp:${phoneNumber}`, auth.otpTtlSeconds)
				.set(`otp:cooldown:${phoneNumber}`, '1', 'EX', auth.otpCooldownSeconds, 'NX')
				.incr(`otp:throttle:${phoneNumber}`);

			if (Number(throttleStr) === 0) dispatchPipeline.expire(`otp:throttle:${phoneNumber}`, auth.otpThrottleTtlSeconds);
			if (Number(throttleStr) + 1 >= auth.maxThrottleCount)
				dispatchPipeline.expire(`otp:throttle:${phoneNumber}`, auth.otpThrottleTtlSeconds * 2); // if user is throttled, ratelimit them for 2 hours

			await dispatchPipeline.exec();

			return create(RequestOtpResponseSchema, {
				expiryTime: auth.otpTtlSeconds,
				retryCooldown: auth.otpCooldownSeconds
			});
		},

		async verifyOtp(req) {
			const { phoneNumber, otp } = req;

			if (!isValidPhoneNumber(phoneNumber)) throw new ConnectError('Invalid phone number.', Code.InvalidArgument);

			const code = await redis.hget(`otp:${phoneNumber}`, 'code');
			if (!code) throw new ConnectError('OTP not generated for this phone number.', Code.NotFound);

			if (!timingSafeEqual(Buffer.from(code), Buffer.from(otp))) {
				const attempts = await redis.hincrby(`otp:${phoneNumber}`, 'attempts', 1);
				if (attempts >= auth.maxOtpVerifyAttempts) {
					await redis.del(`otp:${phoneNumber}`);
					throw new ConnectError('OTP attempts exhausted.', Code.PermissionDenied);
				}
				throw new ConnectError('OTP does not match.', Code.PermissionDenied);
			}

			const user = await db
				.insertInto('users')
				.values({
					id: randomUUIDv7(),
					phoneNumber
				})
				.onConflict((oc) => oc.column('phoneNumber').doUpdateSet({ updatedAt: sql`now()` })) // this returns the user record even for a returning user, so that we dont have to fetch a user if the table wasn't updated later on.
				.returningAll()
				.executeTakeFirst();

			if (!user) throw new ConnectError('User not found.', Code.NotFound);
			if (user.blacklisted) throw new ConnectError('User is blacklisted.', Code.PermissionDenied);

			const [accessToken, refreshToken] = await Promise.all([generateAccessToken(user.id, user.role), generateRefreshToken()]);
			const refreshTokenHash = hash('sha256', refreshToken, 'hex');

			await redis
				.pipeline()
				.del(`otp:${phoneNumber}`)
				.del(`otp:cooldown:${phoneNumber}`)
				.set(`refreshToken:${refreshTokenHash}`, user.id, 'EX', auth.refreshTokenExpirationDurationSeconds)
				.sadd(`user:sessions:${user.id}`, refreshTokenHash)
				.expire(`user:sessions:${user.id}`, auth.refreshTokenExpirationDurationSeconds) // expire the sessions set with intial 30d duration, but this is rewritten each time a new session is added
				.exec();

			return create(VerifyOtpResponseSchema, {
				accessToken,
				refreshToken,
				user: create(UserSchema, {
					id: user.id,
					name: user.name,
					phoneNumber: user.phoneNumber,
					role: UserRole[user.role],
					isBlacklisted: user.blacklisted,
					createdAt: timestampFromDate(user.createdAt),
					updatedAt: timestampFromDate(user.updatedAt)
				})
			});
		},

		async refreshToken(req) {
			const { refreshToken } = req;

			const hashedToken = hash('sha256', refreshToken, 'hex');

			const userId = await redis.getdel(`refreshToken:${hashedToken}`);
			if (!userId) throw new ConnectError('Invalid refresh token', Code.Unauthenticated);

			const user = await db.selectFrom('users').selectAll().where('id', '=', userId).executeTakeFirst();
			if (!user) throw new ConnectError('User not found', Code.NotFound);
			if (user.blacklisted) throw new ConnectError('User is blacklisted', Code.PermissionDenied);

			const [accessToken, newRefreshToken] = await Promise.all([generateAccessToken(user.id, user.role), generateRefreshToken()]);

			const newRefreshTokenHash = hash('sha256', newRefreshToken, 'hex');

			await redis
				.pipeline()
				.srem(`user:sessions:${userId}`, hashedToken)
				.set(`refreshToken:${newRefreshTokenHash}`, user.id, 'EX', auth.refreshTokenExpirationDurationSeconds)
				.sadd(`user:sessions:${user.id}`, newRefreshTokenHash)
				.expire(`user:sessions:${user.id}`, auth.refreshTokenExpirationDurationSeconds)
				.exec();

			return create(RefreshTokenResponseSchema, {
				accessToken,
				refreshToken: newRefreshToken
			});
		}
	});
