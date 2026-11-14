import { createServer } from 'node:http2';
import { createContextValues } from '@connectrpc/connect';
import { connectNodeAdapter } from '@connectrpc/connect-node';
import { createValidateInterceptor } from '@connectrpc/validate';
import { server as serverConst } from './config.js';
import { db } from './db/database.js';
import catalogRoutes from './handlers/catalog.js';
import { authGate } from './interceptors/auth.gate.js';
import { errorLoggingInterceptor } from './interceptors/errorLogger.js';
import { kLoggerContext, logger } from './logger.js';
import { redis } from './redis/client.js';

const routes = connectNodeAdapter({
	routes: catalogRoutes,
	interceptors: [createValidateInterceptor(), errorLoggingInterceptor],
	contextValues: () => createContextValues().set(kLoggerContext, logger),
	requestGate: authGate
});

const server = createServer(routes);

server.listen(serverConst.port, serverConst.host, () => {
	logger.info(`Catalog service listening on port ${serverConst.port}`);
});

const shutdown = async () => {
	server.close(async () => {
		try {
			await db.destroy();
			await redis.quit();
			process.exit();
		} catch (err) {
			logger.error({ err }, 'Error during shutdown');
			process.exit(1);
		}
	});

	setTimeout(() => {
		process.exit(1);
	}, 10000).unref();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
