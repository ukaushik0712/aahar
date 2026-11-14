import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { db as dbConstant } from '../config.js';
import type { AuthDatabase } from './types.js';

const dialect = new PostgresDialect({
	pool: new Pool({
		database: dbConstant.database,
		host: dbConstant.host,
		user: dbConstant.username,
		password: dbConstant.password,
		port: dbConstant.port,
		max: dbConstant.maxConnections
	})
});

export const db = new Kysely<AuthDatabase>({ dialect, plugins: [new CamelCasePlugin()] });
