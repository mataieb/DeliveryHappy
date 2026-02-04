'use server';

import { prisma } from '@/lib/prisma';
import { ItemCategory, DietaryOption } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export type OptionItemInput = {
    id?: string;
    name: string;
    description?: string;
    price: number;
};

export type OptionGroupInput = {
    id?: string;
    name: string;
    isRequired: boolean;
    allowMultiple: boolean;
    maxOptions?: number;
    options: OptionItemInput[];
};

export type MenuItemInput = {
    id?: string;
    name: string;
    description: string;
    ingredients: string;
    price: number;
    category: ItemCategory;
    dietaryOptions: DietaryOption[];
    spiceLevel?: string;
    optionGroups: OptionGroupInput[];
};

export async function createMenuAction(date: Date, items: MenuItemInput[]) {
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const count = await prisma.menu.count({
            where: {
                date: startOfDay,
            },
        });

        if (count > 0) {
            return { success: false, error: "Un menu existe déjà pour cette date." };
        }

        await prisma.menu.create({
            data: {
                date: startOfDay,
                items: {
                    create: items.map(item => ({
                        name: item.name,
                        description: item.description,
                        ingredients: item.ingredients,
                        price: item.price,
                        category: item.category,
                        dietaryOptions: item.dietaryOptions,
                        spiceLevel: item.spiceLevel,
                        optionGroups: {
                            create: item.optionGroups.map(group => ({
                                name: group.name,
                                isRequired: group.isRequired,
                                allowMultiple: group.allowMultiple,
                                maxOptions: group.maxOptions,
                                options: {
                                    create: group.options.map(opt => ({
                                        name: opt.name,
                                        description: opt.description,
                                        price: opt.price
                                    }))
                                }
                            }))
                        }
                    })),
                },
            },
        });

        revalidatePath('/admin/menus');
        return { success: true };
    } catch (error) {
        console.error("Error creating menu:", error);
        return { success: false, error: "Une erreur est survenue lors de la création du menu." };
    }
}

export async function deleteMenuAction(id: string) {
    try {
        await prisma.menu.delete({
            where: { id },
        });
        revalidatePath('/admin/menus');
        return { success: true };
    } catch (error) {
        console.error("Error deleting menu:", error);
        return { success: false, error: "Impossible de supprimer le menu (peut-être lié à des commandes ?)" };
    }
}

export async function updateMenuAction(id: string, date: Date, items: MenuItemInput[]) {
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        // 1. Update Menu Date
        await prisma.menu.update({
            where: { id },
            data: { date: startOfDay },
        });

        // 2. Handle Items
        const existingItems = await prisma.menuItem.findMany({
            where: { menuId: id },
            select: { id: true },
        });
        const existingIds = existingItems.map(i => i.id);
        const incomingIds = items.map(i => i.id).filter(Boolean) as string[];

        // Delete removed items
        const toDeleteIds = existingIds.filter(id => !incomingIds.includes(id));
        if (toDeleteIds.length > 0) {
            await prisma.menuItem.deleteMany({
                where: { id: { in: toDeleteIds } },
            });
        }

        // Upsert (Update or Create)
        for (const item of items) {
            if (item.id) {
                // Update
                // Wipe existing option groups to replace them (simplest strategy)
                await prisma.optionGroup.deleteMany({
                    where: { menuItemId: item.id }
                });

                await prisma.menuItem.update({
                    where: { id: item.id },
                    data: {
                        name: item.name,
                        description: item.description,
                        ingredients: item.ingredients,
                        price: item.price,
                        category: item.category,
                        dietaryOptions: item.dietaryOptions,
                        spiceLevel: item.spiceLevel,
                        optionGroups: {
                            create: item.optionGroups.map(group => ({
                                name: group.name,
                                isRequired: group.isRequired,
                                allowMultiple: group.allowMultiple,
                                maxOptions: group.maxOptions,
                                options: {
                                    create: group.options.map(opt => ({
                                        name: opt.name,
                                        description: opt.description,
                                        price: opt.price
                                    }))
                                }
                            }))
                        }
                    },
                });
            } else {
                // Create
                await prisma.menuItem.create({
                    data: {
                        menuId: id,
                        name: item.name,
                        description: item.description,
                        ingredients: item.ingredients,
                        price: item.price,
                        category: item.category,
                        dietaryOptions: item.dietaryOptions,
                        spiceLevel: item.spiceLevel,
                        optionGroups: {
                            create: item.optionGroups.map(group => ({
                                name: group.name,
                                isRequired: group.isRequired,
                                allowMultiple: group.allowMultiple,
                                maxOptions: group.maxOptions,
                                options: {
                                    create: group.options.map(opt => ({
                                        name: opt.name,
                                        description: opt.description,
                                        price: opt.price
                                    }))
                                }
                            }))
                        }
                    },
                });
            }
        }

        revalidatePath('/admin/menus');
        return { success: true };
    } catch (error) {
        console.error("Error updating menu:", error);
        return { success: false, error: "Une erreur est survenue lors de la mise à jour du menu." };
    }
}
