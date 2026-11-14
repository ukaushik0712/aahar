import { parseEnvNumber, parseEnvString } from '@aahar/util/env';

export const db = {
	database: parseEnvString('AAHAR_AUTH_DB_DATABASE', 'aahar_auth'),
	host: parseEnvString('AAHAR_AUTH_DB_HOST', 'localhost'),
	port: parseEnvNumber('AAHAR_AUTH_DB_PORT', 5432),
	username: parseEnvString('AAHAR_AUTH_DB_USERNAME', 'admin'),
	password: parseEnvString('AAHAR_AUTH_DB_PASSWORD'),
	maxConnections: parseEnvNumber('AAHAR_AUTH_DB_MAX_CONNECTIONS', 10)
} as const;

export const dragonfly = {
	host: parseEnvString('AAHAR_AUTH_DRAGONFLY_HOST', 'localhost'),
	port: parseEnvNumber('AAHAR_AUTH_DRAGONFLY_PORT', 6379),
	username: parseEnvString('AAHAR_AUTH_DRAGONFLY_USERNAME', 'admin')
} as const;

export const auth = {
	otpTtlSeconds: 120,
	otpCooldownSeconds: 60,
	otpThrottleTtlSeconds: 3600,
	maxThrottleCount: 5,
	maxOtpVerifyAttempts: 6,
	accessTokenJwtExpirationDurationSeconds: 15 * 60,
	refreshTokenExpirationDurationSeconds: 30 * 24 * 60 * 60,
	ungatedMethods: ['RequestOtp', 'VerifyOtp', 'RefreshToken'] // requests which are ignored by the auth gate
} as const;

export const server = {
	port: parseEnvNumber('AAHAR_AUTH_SERVER_PORT', 3005),
	host: parseEnvString('AAHAR_AUTH_SERVER_HOST', '127.0.0.1')
};
