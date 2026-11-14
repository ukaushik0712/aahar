import { UserRole } from '@aahar/proto/auth/v1';
import type { CatalogService } from '@aahar/proto/catalog/v1';
import { parseEnvNumber, parseEnvString } from '@aahar/util/env';

export const db = {
	database: parseEnvString('AAHAR_CATALOG_DB_DATABASE', 'aahar_catalog'),
	host: parseEnvString('AAHAR_CATALOG_DB_HOST', 'localhost'),
	port: parseEnvNumber('AAHAR_CATALOG_DB_PORT', 5432),
	username: parseEnvString('AAHAR_CATALOG_DB_USERNAME', 'admin'),
	password: parseEnvString('AAHAR_CATALOG_DB_PASSWORD'),
	maxConnections: parseEnvNumber('AAHAR_CATALOG_DB_MAX_CONNECTIONS', 10)
} as const;

export const dragonfly = {
	host: parseEnvString('AAHAR_CATALOG_DRAGONFLY_HOST', 'localhost'),
	port: parseEnvNumber('AAHAR_CATALOG_DRAGONFLY_PORT', 6379),
	username: parseEnvString('AAHAR_CATALOG_DRAGONFLY_USERNAME', 'admin')
} as const;

export const server = {
	port: parseEnvNumber('AAHAR_CATALOG_SERVER_PORT', 3006),
	host: parseEnvString('AAHAR_CATALOG_SERVER_HOST', '127.0.0.1'),
	rbac: {
		getMenu: UserRole.UNSPECIFIED,
		getItem: UserRole.UNSPECIFIED,
		getModifierGroup: UserRole.UNSPECIFIED,

		createCategory: UserRole.STAFF,
		updateCategory: UserRole.STAFF,
		deleteCategory: UserRole.STAFF,

		createItem: UserRole.STAFF,
		updateItem: UserRole.STAFF,
		deleteItem: UserRole.STAFF,

		createModifierGroup: UserRole.STAFF,
		updateModifierGroup: UserRole.STAFF,
		deleteModifierGroup: UserRole.STAFF,

		addModifierGroupToItem: UserRole.STAFF,
		updateItemModifierGroup: UserRole.STAFF,
		removeModifierGroupFromItem: UserRole.STAFF,

		createModifier: UserRole.STAFF,
		updateModifier: UserRole.STAFF,
		deleteModifier: UserRole.STAFF
	} satisfies Record<keyof typeof CatalogService.method, UserRole>
} as const;
