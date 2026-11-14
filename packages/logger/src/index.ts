import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
	level: process.env.LOG_LEVEL || 'INFO',
	transport: isDev
		? {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'HH:MM:ss.l',
					ignore: 'pid,hostname,service'
				}
			}
		: undefined
});

export interface LoggerOptions {
	name: string;
	[key: string]: unknown;
}

export const createLogger = (options: LoggerOptions) => {
	return logger.child({ service: options.name, ...options });
};
