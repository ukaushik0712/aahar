import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

export interface CatalogDatabase {
	categories: CategoriesTable;
	items: ItemsTable;
	modifierGroups: ModifierGroupsTable;
	modifiers: ModifiersTable;
	itemModifierGroups: ItemModifierGroupsTable;
}

export interface CategoriesTable {
	id: string;
	name: string;
	scheduleStart: string;
	scheduleEnd: string;
	displayOrder: number;
	isAvailable: Generated<boolean>;
}

export type CreateCategoryOptions = Insertable<CategoriesTable>;
export type UpdateCategoryOptions = Updateable<CategoriesTable>;

export type FoodType = 'VEG' | 'NON_VEG' | 'VEGAN' | 'EGG' | 'JAIN';

export interface ItemsTable {
	id: string;
	categoryId: string;
	name: string;
	description: string;
	imageUrl: string;
	basePrice: number;
	packagingFee: Generated<number>;
	foodType: FoodType;
	isAvailable: Generated<boolean>;
}

export type CreateItemOptions = Insertable<ItemsTable>;
export type UpdateItemOptions = Updateable<ItemsTable>;

export interface ModifierGroupsTable {
	id: string;
	name: string;
	minSelections: Generated<number>;
	maxSelections: Generated<number>;
	isAvailable: Generated<boolean>;
}

export type CreateModifierGroupOptions = Insertable<ModifierGroupsTable>;
export type UpdateModifierGroupOptions = Updateable<ModifierGroupsTable>;

export interface ModifiersTable {
	id: string;
	modifierGroupId: string;
	name: string;
	priceDelta: number;
	isAvailable: Generated<boolean>;
}

export type CreateModifierOptions = Insertable<ModifiersTable>;
export type UpdateModifierOptions = Updateable<ModifiersTable>;

export interface ItemModifierGroupsTable {
	itemId: string;
	modifierGroupId: string;
	displayOrder: number;
}

export type AddModifierGroupToItemOptions = Insertable<ItemModifierGroupsTable>;

export type Category = Selectable<CategoriesTable>;
export type Item = Selectable<ItemsTable>;
export type ModifierGroup = Selectable<ModifierGroupsTable>;
export type Modifier = Selectable<ModifiersTable>;
export type ModifierGroupWithModifiers = ModifierGroup & { modifiers: Modifier[] };
