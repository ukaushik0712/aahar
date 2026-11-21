import { randomUUIDv7 } from 'node:crypto';
import {
	AddModifierGroupToItemResponseSchema,
	CatalogService,
	CreateCategoryResponseSchema,
	CreateItemResponseSchema,
	CreateModifierGroupResponseSchema,
	CreateModifierResponseSchema,
	DeleteCategoryResponseSchema,
	DeleteItemResponseSchema,
	DeleteModifierGroupResponseSchema,
	DeleteModifierResponseSchema,
	FoodType as FoodTypeProto,
	GetItemResponseSchema,
	GetModifierGroupResponseSchema,
	RemoveModifierGroupFromItemResponseSchema,
	UpdateCategoryResponseSchema,
	UpdateItemModifierGroupResponseSchema,
	UpdateItemResponseSchema,
	UpdateModifierGroupResponseSchema,
	UpdateModifierResponseSchema
} from '@aahar/proto/catalog/v1';
import { create } from '@bufbuild/protobuf';
import { Code, ConnectError, type ConnectRouter } from '@connectrpc/connect';
import { DatabaseError } from 'pg';
import type { FoodType } from '../db/types.js';
import { toMenuItemSummary, toModifierGroup } from '../mappers/catalog.mapper.js';
import { cacheService } from '../services/cache.service.js';
import {
	addModifierGroupToItemQuery,
	createCategoryQuery,
	createItemQuery,
	createModifierGroupQuery,
	createModifierQuery,
	deleteCategoryQuery,
	deleteItemQuery,
	deleteModifierGroupQuery,
	deleteModifierQuery,
	getItemModifierGroupsQuery,
	getItemQuery,
	getModifierGroupQuery,
	removeModifierGroupFromItemQuery,
	updateCategoryQuery,
	updateItemModifierGroupQuery,
	updateItemQuery,
	updateModifierGroupQuery,
	updateModifierQuery
} from '../services/query.service.js';

export default (router: ConnectRouter) =>
	router.service(CatalogService, {
		async getMenu() {
			return cacheService.getMenu();
		},

		async getItem(req) {
			const { id, includeModifiers } = req;

			const item = await getItemQuery(id).executeTakeFirst();
			if (!item) throw new ConnectError('Item does not exist.', Code.NotFound);

			const modifierGroups = includeModifiers && item.hasModifiers ? await getItemModifierGroupsQuery(id).execute() : [];

			return create(GetItemResponseSchema, {
				item: toMenuItemSummary(item),
				modifierGroups: modifierGroups.map(toModifierGroup)
			});
		},

		async getModifierGroup(req) {
			const { id } = req;

			const modifierGroup = await getModifierGroupQuery(id, true).executeTakeFirst();

			if (!modifierGroup) throw new ConnectError('Modifier group does not exist.', Code.NotFound);

			return create(GetModifierGroupResponseSchema, {
				modifierGroup: toModifierGroup(modifierGroup)
			});
		},

		// #region Category CUD

		async createCategory(req) {
			const { name, scheduleStart, scheduleEnd, displayOrder } = req;

			const id = randomUUIDv7();
			const data = await createCategoryQuery({ id, name, scheduleStart, scheduleEnd, displayOrder }).executeTakeFirstOrThrow();

			await cacheService.invalidateMenu();

			return create(CreateCategoryResponseSchema, {
				category: data
			});
		},

		async updateCategory(req) {
			const { id, ...patchFields } = req;

			const hasUpdates = Object.values(patchFields).some((val) => val !== undefined);
			if (!hasUpdates) throw new ConnectError('At least one field must be provided for update.', Code.InvalidArgument);

			const updatedCategory = await updateCategoryQuery(id, {
				name: patchFields.name,
				scheduleStart: patchFields.scheduleStart,
				scheduleEnd: patchFields.scheduleEnd,
				displayOrder: patchFields.displayOrder,
				isAvailable: patchFields.isAvailable
			}).executeTakeFirst();

			if (!updatedCategory) throw new ConnectError('Category does not exist.', Code.NotFound);

			await cacheService.invalidateMenu();

			return create(UpdateCategoryResponseSchema, {
				category: updatedCategory
			});
		},

		async deleteCategory(req) {
			const { id } = req;

			const data = await deleteCategoryQuery(id).executeTakeFirst();
			if (!data) throw new ConnectError('Category does not exist.', Code.NotFound);

			await cacheService.invalidateMenu();

			return create(DeleteCategoryResponseSchema, {});
		},

		// #endregion

		// #region Item CUD

		async createItem(req) {
			const { categoryId, name, description, imageUrl, basePrice, packagingFee, foodType } = req;

			const id = randomUUIDv7();

			try {
				if (foodType === FoodTypeProto.UNSPECIFIED) throw new ConnectError('Food type cannot be Unspecified.', Code.InvalidArgument);

				const item = await createItemQuery({
					id,
					categoryId,
					name,
					description,
					imageUrl,
					basePrice: Number(basePrice),
					packagingFee: Number(packagingFee),
					foodType: FoodTypeProto[foodType] as FoodType
				}).executeTakeFirstOrThrow();

				await cacheService.invalidateMenu();

				return create(CreateItemResponseSchema, {
					item: toMenuItemSummary({ ...item, hasModifiers: false })
				});
			} catch (err: any) {
				if (err instanceof DatabaseError && err.code === '23503') throw new ConnectError('Category does not exist.', Code.NotFound);
				throw err;
			}
		},

		async updateItem(req) {
			const { id, ...patchFields } = req;

			const hasUpdates = Object.values(patchFields).some((val) => val !== undefined);
			if (!hasUpdates) throw new ConnectError('At least one field must be provided for update.', Code.InvalidArgument);
			if (patchFields.foodType === FoodTypeProto.UNSPECIFIED) throw new ConnectError('Food type cannot be Unspecified.', Code.InvalidArgument);

			try {
				const item = await updateItemQuery(id, {
					categoryId: patchFields.categoryId,
					name: patchFields.name,
					description: patchFields.description,
					imageUrl: patchFields.imageUrl,
					basePrice: patchFields.basePrice !== undefined ? Number(patchFields.basePrice) : undefined,
					packagingFee: patchFields.packagingFee !== undefined ? Number(patchFields.packagingFee) : undefined,
					foodType: patchFields.foodType ? (FoodTypeProto[patchFields.foodType] as FoodType) : undefined,
					isAvailable: patchFields.isAvailable
				}).executeTakeFirst();

				if (!item) throw new ConnectError('Item does not exist.', Code.NotFound);

				await cacheService.invalidateMenu();

				return create(UpdateItemResponseSchema, {
					item: toMenuItemSummary(item)
				});
			} catch (err: any) {
				if (err instanceof DatabaseError && err.code === '23503') throw new ConnectError('Category does not exist.', Code.NotFound);
				throw err;
			}
		},

		async deleteItem(req) {
			const { id } = req;

			const item = await deleteItemQuery(id).executeTakeFirst();
			if (!item) throw new ConnectError('Item does not exist.', Code.NotFound);

			await cacheService.invalidateMenu();

			return create(DeleteItemResponseSchema, {});
		},

		// #endregion

		// #region Modifier Group CUD
		async createModifierGroup(req) {
			const { name, minSelections, maxSelections } = req;

			if (minSelections > maxSelections) throw new ConnectError('Max selections cannot be lesser than min selections', Code.InvalidArgument);

			const id = randomUUIDv7();

			const modifierGroup = await createModifierGroupQuery({
				id,
				name,
				minSelections,
				maxSelections
			}).executeTakeFirstOrThrow();

			return create(CreateModifierGroupResponseSchema, {
				modifierGroup
			});
		},

		async updateModifierGroup(req) {
			const { id, ...fields } = req;

			const hasUpdates = Object.values(fields).some((val) => val !== undefined);
			if (!hasUpdates) throw new ConnectError('At least one field must be provided for update.', Code.InvalidArgument);

			if (fields.minSelections !== undefined && fields.maxSelections !== undefined && fields.minSelections > fields.maxSelections) {
				throw new ConnectError('Max selections cannot be lesser than min selections', Code.InvalidArgument);
			}

			try {
				const modifierGroup = await updateModifierGroupQuery(id, {
					name: fields.name,
					minSelections: fields.minSelections,
					maxSelections: fields.maxSelections,
					isAvailable: fields.isAvailable
				}).executeTakeFirst();

				if (!modifierGroup) throw new ConnectError('Modifier group does not exist.', Code.NotFound);

				return create(UpdateModifierGroupResponseSchema, {
					modifierGroup
				});
			} catch (err) {
				if (err instanceof DatabaseError) {
					if (err.code === '23514') throw new ConnectError('max_selections cannot be less than min_selections', Code.InvalidArgument);
				}
				throw err;
			}
		},

		async deleteModifierGroup(req) {
			const { id } = req;

			const modifierGroup = await deleteModifierGroupQuery(id).executeTakeFirst();
			if (!modifierGroup) throw new ConnectError('Modifier group does not exist.', Code.NotFound);

			await cacheService.invalidateMenu();

			return create(DeleteModifierGroupResponseSchema, {});
		},

		// #endregion

		// #region Modifier CUD

		async createModifier(req) {
			const { modifierGroupId, name, priceDelta } = req;

			try {
				const id = randomUUIDv7();

				const modifier = await createModifierQuery({
					id,
					name,
					modifierGroupId,
					priceDelta: Number(priceDelta)
				}).executeTakeFirstOrThrow();

				return create(CreateModifierResponseSchema, {
					modifier: {
						...modifier,
						priceDelta: BigInt(modifier.priceDelta)
					}
				});
			} catch (err: any) {
				if (err instanceof DatabaseError && err.code === '23503') throw new ConnectError('Modifier group does not exist.', Code.NotFound);
				throw err;
			}
		},

		async updateModifier(req) {
			const { id, ...fields } = req;

			const hasUpdates = Object.values(fields).some((m) => m !== undefined);
			if (!hasUpdates) throw new ConnectError('At least one field must be provided for update.', Code.InvalidArgument);

			try {
				const modifier = await updateModifierQuery(id, {
					name: fields.name,
					modifierGroupId: fields.modifierGroupId,
					priceDelta: fields.priceDelta !== undefined ? Number(fields.priceDelta) : undefined,
					isAvailable: fields.isAvailable
				}).executeTakeFirst();

				if (!modifier) throw new ConnectError('Modifier does not exist.', Code.NotFound);

				return create(UpdateModifierResponseSchema, {
					modifier: {
						...modifier,
						priceDelta: BigInt(modifier.priceDelta)
					}
				});
			} catch (err: any) {
				if (err instanceof DatabaseError && err.code === '23503') throw new ConnectError('Modifier group does not exist.', Code.NotFound);
				throw err;
			}
		},

		async deleteModifier(req) {
			const { id } = req;

			const modifier = await deleteModifierQuery(id).executeTakeFirst();
			if (!modifier) throw new ConnectError('Modifier does not exist.', Code.NotFound);

			return create(DeleteModifierResponseSchema, {});
		},

		// #endregion

		// #region Misc
		async addModifierGroupToItem(req) {
			const { itemId, modifierGroupId, displayOrder } = req;

			try {
				await addModifierGroupToItemQuery({
					itemId,
					modifierGroupId,
					displayOrder
				}).executeTakeFirstOrThrow();

				await cacheService.invalidateMenu();

				return create(AddModifierGroupToItemResponseSchema, {});
			} catch (err: any) {
				if (err instanceof DatabaseError) {
					if (err.code === '23505') throw new ConnectError('Modifier group is already attached to this item.', Code.AlreadyExists);

					if (err.code === '23503') {
						if (err.constraint === 'item_modifier_groups_item_id_fkey') throw new ConnectError('Item does not exist.', Code.NotFound);
						if (err.constraint === 'item_modifier_groups_modifier_group_id_fkey')
							throw new ConnectError('Modifier group does not exist.', Code.NotFound);
					}
				}

				throw err;
			}
		},

		async updateItemModifierGroup(req) {
			const { itemId, modifierGroupId, displayOrder } = req;

			if (displayOrder === undefined) throw new ConnectError('Display order is the only field that can be updated.', Code.InvalidArgument);

			const updated = await updateItemModifierGroupQuery(itemId, modifierGroupId, displayOrder).executeTakeFirst();
			if (!updated) throw new ConnectError('Item modifier group association not found.', Code.NotFound);

			await cacheService.invalidateMenu();

			return create(UpdateItemModifierGroupResponseSchema, {
				itemId: updated.itemId,
				modifierGroupId: updated.modifierGroupId,
				displayOrder: updated.displayOrder
			});
		},

		async removeModifierGroupFromItem(req) {
			const { itemId, modifierGroupId } = req;

			const deleted = await removeModifierGroupFromItemQuery(itemId, modifierGroupId).executeTakeFirst();
			if (!deleted) throw new ConnectError('Item modifier group association not found.', Code.NotFound);

			await cacheService.invalidateMenu();

			return create(RemoveModifierGroupFromItemResponseSchema, {});
		}

		// #endregion
	});
