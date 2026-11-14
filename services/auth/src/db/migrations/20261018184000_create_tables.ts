import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
	await db.schema.createType('user_role').asEnum(['STUDENT', 'STAFF', 'SUDO']).execute();

	await db.schema
		.createTable('users')
		.addColumn('id', 'uuid', (col) => col.primaryKey())
		.addColumn('phone_number', 'varchar(15)', (col) => col.notNull().unique())
		.addColumn('name', 'varchar(256)', (col) => col.defaultTo(''))
		.addColumn('role', sql`"user_role"`, (col) => col.notNull().defaultTo('STUDENT'))
		.addColumn('blacklisted', 'boolean', (col) => col.notNull().defaultTo(false))
		.addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
		.execute();
}

export async function down(db: Kysely<any>) {
	await db.schema.dropTable('users').execute();
	await db.schema.dropType('user_role').execute();
}
