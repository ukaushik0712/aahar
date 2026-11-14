import { Code, ConnectError, createContextKey, type HandlerContext } from '@connectrpc/connect';

import { auth } from '../config.js';
import type { User } from '../db/types.js';

export interface AuthContext {
	userId: string;
	role: User['role'];
}

export const kAuthContext = createContextKey<AuthContext | undefined>(undefined);

export async function authGate(context: HandlerContext) {
	if (auth.ungatedMethods.includes(context.method.name as (typeof auth.ungatedMethods)[number])) return;

	/**
	 * Envoy does all the JWT Signature verification work.
	 * We just have to read the jwt payload envoy sends throught the headers, and inject that into the auth context.
	 */
	const userId = context.requestHeader.get('x-user-id');
	const role = context.requestHeader.get('x-user-role');

	if (!userId || !role) throw new ConnectError('User ID or Role missing.', Code.Unauthenticated);

	context.values.set(kAuthContext, {
		userId,
		role: role as User['role']
	});
}
