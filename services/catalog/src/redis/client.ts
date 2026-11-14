import { Redis } from 'ioredis';
import { dragonfly } from '../config.js';
import { logger } from '../logger.js';

export const redis = new Redis({ host: dragonfly.host, port: dragonfly.port });

redis.on('ready', () => logger.info('Redis connnected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));
