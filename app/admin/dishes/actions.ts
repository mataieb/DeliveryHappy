'use server';

import { prisma } from '@/lib/prisma';
import { ItemCategory, DietaryOption } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export type DishOptionItemInput = {
    id?: string;
    name: string;
    description?: string;
    price: number;
};

export type DishOptionGroupInput = {
    id?: string;
    name: string;
    isRequired: boolean;
    allowMultiple: boolean;
    maxOptions?: number;
    options: DishOptionItemInput[];
};

export type DishLibraryItemInput = {
    id?: string;
    name: string;
    description: string;
    ingredients: string;
    imageUrl?: string;
    price: number;
    category: ItemCategory;
    dietaryOptions: DietaryOption[];
    spiceLevel?: string;
    optionGroups: DishOptionGroupInput[];
};

export async function getDishLibraryStatsAction(dishId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
        return { success: false, error: 'Non autorisé' };
    }

    try {
        // Count menus using this dish (via MenuItem)
        const menuCount = await prisma.menuItem.count({
            where: { name: { equals: '' } }, // Placeholder - need to join via data
        });

        // Get average rating
        const ratings = await prisma.orderItemRating.findMany({
            where: {
                orderItem: {
                    item: {
                        name: { equals: '' }, // Placeholder
                    }
                }
            }
        });

        const avgRating = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            : null;

        return {
            success: true,
            menuCount,
            averageRating: avgRating,
            reviewCount: ratings.length,
        };
    } catch (error) {
        console.error('[getDishStats] Error:', error);
        return { success: false, error: 'Erreur serveur' };
    }
}

export async function createDishLibraryItemAction(dish: DishLibraryItemInput) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
        return { success: false, error: 'Non autorisé' };
    }

    try {
        await prisma.dishLibraryItem.create({
            data: {
                name: dish.name,
                description: dish.description,
                ingredients: dish.ingredients,
                imageUrl: dish.imageUrl,
                category: dish.category,
                dietaryOptions: dish.dietaryOptions,
                spiceLevel: dish.spiceLevel,
                suggestedPrice: dish.price,
                optionGroups: {
                    create: dish.optionGroups.map(group => ({
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
            }
        });

        revalidatePath('/admin/dishes');
        return { success: true };
    } catch (error) {
        console.error('[createDish] Error:', error);
        return { success: false, error: 'Erreur lors de la création' };
    }
}

export async function updateDishLibraryItemAction(id: string, dish: DishLibraryItemInput) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
        return { success: false, error: 'Non autorisé' };
    }

    try {
        // Delete and recreate option groups
        await prisma.dishOptionGroup.deleteMany({
            where: { dishId: id }
        });

        await prisma.dishLibraryItem.update({
            where: { id },
            data: {
                name: dish.name,
                description: dish.description,
                ingredients: dish.ingredients,
                imageUrl: dish.imageUrl,
                category: dish.category,
                dietaryOptions: dish.dietaryOptions,
                spiceLevel: dish.spiceLevel,
                suggestedPrice: dish.price,
                optionGroups: {
                    create: dish.optionGroups.map(group => ({
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
            }
        });

        revalidatePath('/admin/dishes');
        return { success: true };
    } catch (error) {
        console.error('[updateDish] Error:', error);
        return { success: false, error: 'Erreur lors de la mise à jour' };
    }
}

export async function deleteDishLibraryItemAction(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'ADMIN') {
        return { success: false, error: 'Non autorisé' };
    }

    try {
        await prisma.dishLibraryItem.delete({
            where: { id }
        });

        revalidatePath('/admin/dishes');
        return { success: true };
    } catch (error) {
        console.error('[deleteDish] Error:', error);
        return { success: false, error: 'Impossible à supprimer (peut-être utilisé dans un menu ?)' };
    }
}
