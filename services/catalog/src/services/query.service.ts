import type { SelectQueryBuilder } from 'kysely';
import { jsonArrayFrom } from 'kysely/helpers/postgres';
import { db } from '../db/database.js';
import type {
	AddModifierGroupToItemOptions,
	CatalogDatabase,
	CreateCategoryOptions,
	CreateItemOptions,
	CreateModifierGroupOptions,
	CreateModifierOptions,
	ModifierGroup,
	ModifierGroupWithModifiers,
	UpdateCategoryOptions,
	UpdateItemOptions,
	UpdateModifierGroupOptions,
	UpdateModifierOptions
} from '../db/types.js';

/**
 * Returns all categories with their associated items
 */
export function getCategoriesWithItems() {
	return db
		.selectFrom('categories')
		.selectAll('categories')
		.select((eb) => [
			jsonArrayFrom(
				eb
					.selectFrom('items')
					.selectAll('items')
					.select((itemEb) => [
						itemEb
							.exists(
								itemEb
									.selectFrom('itemModifierGroups')
									.select('itemModifierGroups.itemId')
									.whereRef('itemModifierGroups.itemId', '=', 'items.id')
							)
							.as('hasModifiers')
					])
					.whereRef('items.categoryId', '=', 'categories.id')
					.orderBy('items.name', 'asc') // present so items aren't shuffled on each request within categories and are properly cached
			).as('items')
		])
		.orderBy('categories.displayOrder', 'asc');
}

/**
 * Returns the kysely built sql query for getting a single item.
 */
export function getItemQuery(itemId: string) {
	return db
		.selectFrom('items')
		.selectAll('items')
		.select((eb) => [
			eb
				.exists(
					eb.selectFrom('itemModifierGroups').select('itemModifierGroups.itemId').whereRef('itemModifierGroups.itemId', '=', 'items.id')
				)
				.as('hasModifiers')
		])
		.where('items.id', '=', itemId);
}

/**
 * Returns all modifier groups and associated modifiers for an item
 */
export function getItemModifierGroupsQuery(itemId: string) {
	return db
		.selectFrom('itemModifierGroups')
		.innerJoin('modifierGroups', 'modifierGroups.id', 'itemModifierGroups.modifierGroupId')
		.selectAll('modifierGroups')
		.select((eb) => [
			jsonArrayFrom(
				eb
					.selectFrom('modifiers')
					.selectAll('modifiers')
					.whereRef('modifiers.modifierGroupId', '=', 'modifierGroups.id')
					.orderBy('modifiers.name', 'asc')
			).as('modifiers')
		])
		.where('itemModifierGroups.itemId', '=', itemId)
		.orderBy('itemModifierGroups.displayOrder', 'asc');
}

/**
 * Returns a modifier group corresponding to the given id
 */
export function getModifierGroupQuery(
	modifierGroupId: string,
	withModifiers: true
): SelectQueryBuilder<CatalogDatabase, 'modifierGroups', ModifierGroupWithModifiers>;

export function getModifierGroupQuery(
	modifierGroupId: string,
	withModifiers?: false
): SelectQueryBuilder<CatalogDatabase, 'modifierGroups', ModifierGroup>;

export function getModifierGroupQuery(modifierGroupId: string, withModifiers: boolean = false) {
	const baseQuery = db.selectFrom('modifierGroups').selectAll('modifierGroups').where('modifierGroups.id', '=', modifierGroupId);

	if (withModifiers)
		return baseQuery.select((eq) => [
			jsonArrayFrom(
				eq
					.selectFrom('modifiers')
					.selectAll('modifiers')
					.whereRef('modifiers.modifierGroupId', '=', 'modifierGroups.id')
					.orderBy('modifiers.name', 'asc')
			).as('modifiers')
		]);

	return baseQuery;
}

// #region Category CUD

export function createCategoryQuery(options: CreateCategoryOptions) {
	return db.insertInto('categories').values(options).returningAll();
}

export function updateCategoryQuery(id: string, options: Omit<UpdateCategoryOptions, 'id'>) {
	return db.updateTable('categories').set(options).where('id', '=', id).returningAll();
}

export function deleteCategoryQuery(id: string) {
	return db.deleteFrom('categories').where('id', '=', id).returningAll();
}

// #endregion

// #region Item CUD

export function createItemQuery(options: CreateItemOptions) {
	return db.insertInto('items').values(options).returningAll();
}

export function updateItemQuery(id: string, options: UpdateItemOptions) {
	return db
		.with('updated', (db) => db.updateTable('items').where('id', '=', id).set(options).returningAll())
		.selectFrom('updated')
		.selectAll('updated')
		.select((eb) => [
			eb
				.exists(
					eb.selectFrom('itemModifierGroups').select('itemModifierGroups.itemId').whereRef('itemModifierGroups.itemId', '=', 'updated.id')
				)
				.as('hasModifiers')
		]);
}

export function deleteItemQuery(id: string) {
	return db.deleteFrom('items').where('id', '=', id).returningAll();
}

// #endregion

// #region Modifier Group CUD

export function createModifierGroupQuery(options: CreateModifierGroupOptions) {
	return db.insertInto('modifierGroups').values(options).returningAll();
}

export function updateModifierGroupQuery(id: string, options: UpdateModifierGroupOptions) {
	return db.updateTable('modifierGroups').where('id', '=', id).set(options).returningAll();
}

export function deleteModifierGroupQuery(id: string) {
	return db.deleteFrom('modifierGroups').where('id', '=', id).returningAll();
}

/// #endregion

// #region Modifier CUD

export function createModifierQuery(options: CreateModifierOptions) {
	return db.insertInto('modifiers').values(options).returningAll();
}

export function updateModifierQuery(id: string, options: UpdateModifierOptions) {
	return db.updateTable('modifiers').where('id', '=', id).set(options).returningAll();
}

export function deleteModifierQuery(id: string) {
	return db.deleteFrom('modifiers').where('id', '=', id).returningAll();
}

// #endregion

// #region Misc

export function addModifierGroupToItemQuery(options: AddModifierGroupToItemOptions) {
	return db.insertInto('itemModifierGroups').values(options).returningAll();
}

export function updateItemModifierGroupQuery(itemId: string, modifierGroupId: string, displayOrder: number) {
	return db
		.updateTable('itemModifierGroups')
		.set({ displayOrder })
		.where('itemModifierGroups.itemId', '=', itemId)
		.where('itemModifierGroups.modifierGroupId', '=', modifierGroupId)
		.returningAll();
}

export function removeModifierGroupFromItemQuery(itemId: string, modifierGroupId: string) {
	return db
		.deleteFrom('itemModifierGroups')
		.where('itemModifierGroups.itemId', '=', itemId)
		.where('itemModifierGroups.modifierGroupId', '=', modifierGroupId)
		.returningAll();
}
// #endregion
