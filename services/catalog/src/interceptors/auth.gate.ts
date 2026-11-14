import { UserRole } from '@aahar/proto/auth/v1';
import { Code, ConnectError, createContextKey, type HandlerContext } from '@connectrpc/connect';
import { server } from '../config.js';

export interface AuthContext {
	userId: string;
	role: Exclude<keyof typeof UserRole, 'UNSPECIFIED'>;
}

export const kAuthContext = createContextKey<AuthContext | undefined>(undefined);

export async function authGate(context: HandlerContext) {
	const requiredRole = server.rbac[context.method.localName as keyof typeof server.rbac];

	const userId = context.requestHeader.get('x-user-id');
	const role = context.requestHeader.get('x-user-role');

	if (requiredRole === UserRole.UNSPECIFIED) {
		if (userId && role) {
			context.values.set(kAuthContext, { userId, role: role as AuthContext['role'] });
		}
		return;
	}

	if (!userId || !role) throw new ConnectError('User ID or Role missing.', Code.Unauthenticated);
	if (requiredRole === undefined) throw new ConnectError('No permissions specified for this route. Contact developers.', Code.PermissionDenied);

	const roleNum = UserRole[role as keyof typeof UserRole];
	if (!roleNum || requiredRole > roleNum) throw new ConnectError('Insufficient permissions for this operation.', Code.PermissionDenied);

	context.values.set(kAuthContext, {
		userId,
		role: role as AuthContext['role']
	});
}
