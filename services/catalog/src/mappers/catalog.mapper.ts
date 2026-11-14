import { FoodType, MenuItemSummarySchema, ModifierGroupSchema } from '@aahar/proto/catalog/v1';
import { create, type MessageInitShape } from '@bufbuild/protobuf';
import type { Item, ModifierGroupWithModifiers } from '../db/types.js';

export function toMenuItemSummary(item: Item & { hasModifiers: boolean | number }): MessageInitShape<typeof MenuItemSummarySchema> {
	return create(MenuItemSummarySchema, {
		id: item.id,
		categoryId: item.categoryId,
		name: item.name,
		description: item.description,
		imageUrl: item.imageUrl,
		basePrice: BigInt(item.basePrice),
		packagingFee: BigInt(item.packagingFee),
		foodType: FoodType[item.foodType],
		isAvailable: item.isAvailable,
		hasModifiers: Boolean(item.hasModifiers)
	});
}

export function toModifierGroup(modifierGroup: ModifierGroupWithModifiers): MessageInitShape<typeof ModifierGroupSchema> {
	return create(ModifierGroupSchema, {
		id: modifierGroup.id,
		name: modifierGroup.name,
		minSelections: Number(modifierGroup.minSelections),
		maxSelections: Number(modifierGroup.maxSelections),
		isAvailable: Boolean(modifierGroup.isAvailable),
		modifiers: modifierGroup.modifiers.map((modifier) => {
			return {
				id: modifier.id,
				modifierGroupId: modifier.modifierGroupId,
				name: modifier.name,
				priceDelta: BigInt(modifier.priceDelta),
				isAvailable: Boolean(modifier.isAvailable)
			};
		})
	});
}
