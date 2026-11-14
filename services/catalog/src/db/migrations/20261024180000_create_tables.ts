import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>) {
	await db.schema
		.createTable('categories')
		.addColumn('id', 'uuid', (c) => c.primaryKey())
		.addColumn('name', 'varchar(128)', (c) => c.notNull())
		.addColumn('schedule_start', 'char(5)', (c) => c.notNull())
		.addColumn('schedule_end', 'char(5)', (c) => c.notNull())
		.addColumn('display_order', 'integer', (c) => c.notNull())
		.addColumn('is_available', 'boolean', (c) => c.defaultTo(true).notNull())
		.execute();

	await db.schema.createType('food_type').asEnum(['VEG', 'NON_VEG', 'VEGAN', 'EGG', 'JAIN']).execute();

	await db.schema
		.createTable('items')
		.addColumn('id', 'uuid', (c) => c.primaryKey())
		.addColumn('category_id', 'uuid', (c) => c.references('categories.id').onDelete('cascade').notNull())
		.addColumn('name', 'varchar(128)', (c) => c.notNull())
		.addColumn('description', 'varchar(512)', (c) => c.notNull())
		.addColumn('image_url', 'varchar(256)', (c) => c.notNull())
		.addColumn('base_price', 'integer', (c) => c.notNull())
		.addColumn('packaging_fee', 'integer', (c) => c.defaultTo(0).notNull())
		.addColumn('food_type', sql`food_type`, (c) => c.notNull())
		.addColumn('is_available', 'boolean', (c) => c.defaultTo(true).notNull())
		.execute();

	await db.schema.createIndex('items_category_id_idx').on('items').column('category_id').execute();

	await db.schema
		.createTable('modifier_groups')
		.addColumn('id', 'uuid', (c) => c.primaryKey())
		.addColumn('name', 'varchar(128)', (c) => c.notNull())
		.addColumn('min_selections', 'integer', (c) => c.defaultTo(0).notNull().check(sql`min_selections <= max_selections`))
		.addColumn('max_selections', 'integer', (c) => c.defaultTo(1).notNull())
		.addColumn('is_available', 'boolean', (c) => c.defaultTo(true).notNull())
		.execute();

	await db.schema
		.createTable('modifiers')
		.addColumn('id', 'uuid', (c) => c.primaryKey())
		.addColumn('modifier_group_id', 'uuid', (c) => c.references('modifier_groups.id').onDelete('cascade').notNull())
		.addColumn('name', 'varchar(128)', (c) => c.notNull())
		.addColumn('price_delta', 'integer', (c) => c.notNull())
		.addColumn('is_available', 'boolean', (c) => c.defaultTo(true).notNull())
		.execute();

	await db.schema.createIndex('modifiers_modifier_groups_id_idx').on('modifiers').column('modifier_group_id').execute();

	await db.schema
		.createTable('item_modifier_groups')
		.addColumn('item_id', 'uuid', (c) => c.references('items.id').onDelete('cascade').notNull())
		.addColumn('modifier_group_id', 'uuid', (c) => c.references('modifier_groups.id').onDelete('cascade').notNull())
		.addColumn('display_order', 'integer', (c) => c.notNull())
		.addPrimaryKeyConstraint('primary_key', ['item_id', 'modifier_group_id'])
		.execute();

	await db.schema.createIndex('item_modifier_groups_id_idx').on('item_modifier_groups').column('modifier_group_id').execute();
}

export async function down(db: Kysely<any>) {
	await db.schema.dropTable('item_modifier_groups').execute();
	await db.schema.dropTable('modifiers').execute();
	await db.schema.dropTable('modifier_groups').execute();
	await db.schema.dropTable('items').execute();
	await db.schema.dropTable('categories').execute();
	await db.schema.dropType('food_type').execute();
}
