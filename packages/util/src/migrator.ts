import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Kysely } from 'kysely';
import { FileMigrationProvider, Migrator } from 'kysely/migration';

export async function runMigrations(db: Kysely<any>, migrationFolder: string) {
	const migrator = new Migrator({
		db,
		provider: new FileMigrationProvider({
			fs,
			path: {
				...path,
				join: (...args) => pathToFileURL(path.join(...args)).href
			},
			migrationFolder
		})
	});

	const direction = process.argv.includes('--down') ? 'down' : 'latest';

	const { error, results } = direction === 'latest' ? await migrator.migrateToLatest() : await migrator.migrateDown();

	results?.forEach((it) => {
		if (it.status === 'Success') {
			console.log(`Migration "${it.migrationName}" was executed successfully`);
		} else if (it.status === 'Error') {
			console.error(`Failed to execute migration "${it.migrationName}"`);
		}
	});

	if (error) {
		console.error('Migration failed', error);
		process.exit(1);
	}

	await db.destroy();
}
