import { ConnectError, type Interceptor } from '@connectrpc/connect';
import { kLoggerContext } from '../server.js';

export const errorLoggingInterceptor: Interceptor = (next) => async (req) => {
	try {
		return await next(req);
	} catch (err) {
		if (!(err instanceof ConnectError)) req.contextValues.get(kLoggerContext).error({ err }, `Error handling ${req.method.name}`);
		throw err;
	}
};
