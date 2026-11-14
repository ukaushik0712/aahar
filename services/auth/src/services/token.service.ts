import { randomBytes } from 'node:crypto';
import { parseEnvString } from '@aahar/util/env';
import { importPKCS8, SignJWT } from 'jose';
import { auth } from '../config.js';
import type { User } from '../db/types.js';

const privateKey = await importPKCS8(parseEnvString('AAHAR_AUTH_JWTSIGN_PRIVATE_KEY'), 'Ed25519');

/**
 * Generate an access token signed with ED25519.
 */
export async function generateAccessToken(userId: string, role: User['role']) {
	return new SignJWT({ role })
		.setProtectedHeader({ alg: 'EdDSA' })
		.setIssuedAt()
		.setIssuer('aahar:auth')
		.setSubject(userId)
		.setExpirationTime(`${auth.accessTokenJwtExpirationDurationSeconds}s`)
		.sign(privateKey);
}

/**
 * Generate a random 32 byte refresh token.
 */
export async function generateRefreshToken() {
	return randomBytes(32).toString('hex');
}
