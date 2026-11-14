import { runMigrations } from '@aahar/util/migrator';
import { db } from './database.js';

await runMigrations(db, './src/db/migrations');
