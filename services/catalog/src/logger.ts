import { createLogger } from '@aahar/logger';
import { createContextKey } from '@connectrpc/connect';

export const logger = createLogger({ name: '@aahar/catalog' });
export const kLoggerContext = createContextKey<typeof logger>(logger);
