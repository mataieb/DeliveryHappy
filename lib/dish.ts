import { ItemCategory, DietaryOption } from '@prisma/client';

// ─── Flat types ────────────────────────────────────────────────────────────────
// Used throughout the app to represent a MenuItem with its dish data flattened.
// Consumers (components, actions) always receive this shape; the dish/library
// join is transparent to them.

export type FlatOptionItem = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    groupId: string;
};

export type FlatOptionGroup = {
    id: string;
    name: string;
    isRequired: boolean;
    allowMultiple: boolean;
    maxOptions: number | null;
    options: FlatOptionItem[];
};

export type FlatMenuItem = {
    id: string;
    menuId: string;
    dishId: string;
    name: string;
    description: string | null;
    ingredients: string | null;
    category: ItemCategory;
    dietaryOptions: DietaryOption[];
    spiceLevel: string | null;
    price: number;
    blocked: boolean;
    optionGroups: FlatOptionGroup[];
};

// ─── Raw types (as returned by Prisma includes) ────────────────────────────────

type RawOptionItem = {
    id: string;
    name: string;
    description: string | null;
    price: number;
};

type RawOptionGroup = {
    id: string;
    name: string;
    isRequired: boolean;
    allowMultiple: boolean;
    maxOptions: number | null;
    options: RawOptionItem[];
};

type RawDish = {
    name: string;
    description: string | null;
    ingredients: string | null;
    category: ItemCategory;
    dietaryOptions: DietaryOption[];
    spiceLevel: string | null;
};

export type RawMenuItemWithDish = {
    id: string;
    menuId: string;
    dishId: string;
    price: number;
    blocked: boolean;
    dish: RawDish;
    activeOptionGroups: RawOptionGroup[];
};

// ─── Flatten helper ────────────────────────────────────────────────────────────

export function flattenMenuItem(item: RawMenuItemWithDish): FlatMenuItem {
    return {
        id: item.id,
        menuId: item.menuId,
        dishId: item.dishId,
        name: item.dish.name,
        description: item.dish.description,
        ingredients: item.dish.ingredients,
        category: item.dish.category,
        dietaryOptions: item.dish.dietaryOptions,
        spiceLevel: item.dish.spiceLevel,
        price: item.price,
        blocked: item.blocked,
        optionGroups: item.activeOptionGroups.map(g => ({
            id: g.id,
            name: g.name,
            isRequired: g.isRequired,
            allowMultiple: g.allowMultiple,
            maxOptions: g.maxOptions,
            options: g.options.map(o => ({
                id: o.id,
                name: o.name,
                description: o.description,
                price: o.price,
                groupId: g.id,
            })),
        })),
    };
}
