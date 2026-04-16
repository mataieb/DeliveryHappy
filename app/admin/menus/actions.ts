'use server';

import { prisma } from '@/lib/prisma';
import { ItemCategory, DietaryOption } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { sendMenuNotificationEmails, sendWeeklyMenuNotificationEmails } from '@/lib/email';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

export async function getDishLibraryAction() {
    try {
        const dishes = await prisma.dishLibraryItem.findMany({
            orderBy: { name: 'asc' },
            include: {
                optionGroups: {
                    include: { options: true }
                }
            }
        });
        return { success: true, dishes };
    } catch (error) {
        console.error('[getDishLibrary] Error:', error);
        return { success: false, error: 'Erreur lors du chargement', dishes: [] };
    }
}


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

// Note: MenuItem stores a full copy of dish data (name, price, dietaryOptions, optionGroups).
// There is NO link between MenuItem and DishLibraryItem after creation.
// Modifying a dish in the library never affects menus already created.
export async function createMenuAction(date: Date, items: MenuItemInput[], deliveryZoneId?: string | null) {
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
                deliveryZoneId: deliveryZoneId || null,
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

export async function updateMenuAction(id: string, date: Date, items: MenuItemInput[], deliveryZoneId?: string | null) {
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        // 1. Update Menu Date + Zone
        await prisma.menu.update({
            where: { id },
            data: { date: startOfDay, deliveryZoneId: deliveryZoneId || null },
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

export async function copyMenuAction(sourceMenuId: string, targetDate: Date) {
    try {
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        // Check no menu already exists on target date
        const existing = await prisma.menu.count({ where: { date: startOfDay } });
        if (existing > 0) {
            return { success: false, error: "Un menu existe déjà pour cette date." };
        }

        // Fetch source menu with all nested data
        const source = await prisma.menu.findUnique({
            where: { id: sourceMenuId },
            include: {
                items: {
                    include: {
                        optionGroups: {
                            include: { options: true }
                        }
                    }
                }
            }
        });

        if (!source) return { success: false, error: "Menu source introuvable." };

        // Deep-clone to new date — completely new records, no link to original
        await prisma.menu.create({
            data: {
                date: startOfDay,
                items: {
                    create: source.items.map(item => ({
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
                                        price: opt.price,
                                    }))
                                }
                            }))
                        }
                    }))
                }
            }
        });

        revalidatePath('/admin/menus');
        return { success: true };
    } catch (error) {
        console.error("Error copying menu:", error);
        return { success: false, error: "Une erreur est survenue lors de la copie du menu." };
    }
}

export async function sendMenuNotificationAction(menuId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return { success: false, error: 'Accès non autorisé.' };
    }

    try {
        // Fetch menu with items
        const menu = await prisma.menu.findUnique({
            where: { id: menuId },
            include: { items: true },
        });
        if (!menu) return { success: false, error: 'Menu introuvable.' };

        // Fetch all users with an email
        const users = await prisma.user.findMany({
            where: { email: { not: undefined } },
            select: { email: true, name: true },
        });

        const menuDate = dayjs(menu.date).locale('fr').format('dddd D MMMM YYYY');

        const result = await sendMenuNotificationEmails(
            menuDate,
            menu.items.map(i => ({
                name: i.name,
                price: i.price,
                category: i.category,
                description: i.description,
            })),
            users.map(u => ({ email: u.email!, name: u.name }))
        );

        return result;
    } catch (error) {
        console.error('[sendMenuNotification] Error:', error);
        return { success: false, error: 'Erreur serveur lors de la notification.' };
    }
}

export async function sendWeeklyMenuNotificationAction(menuIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return { success: false, error: 'Accès non autorisé.' };
    }

    try {
        const menus = await prisma.menu.findMany({
            where: { id: { in: menuIds } },
            include: { items: true },
            orderBy: { date: 'asc' },
        });

        if (menus.length === 0) {
            return { success: false, error: 'Aucun menu trouvé pour cette semaine.' };
        }

        const users = await prisma.user.findMany({
            where: { email: { not: undefined } },
            select: { email: true, name: true },
        });

        const weekStart = dayjs(menus[0].date).locale('fr').format('D MMMM');
        const weekEnd = dayjs(menus[menus.length - 1].date).locale('fr').format('D MMMM YYYY');
        const weekLabel = `du ${weekStart} au ${weekEnd}`;

        const days = menus.map(m => ({
            date: dayjs(m.date).locale('fr').format('dddd D MMMM'),
            dayShort: dayjs(m.date).locale('fr').format('ddd'),
            items: m.items.map(i => ({
                name: i.name,
                price: i.price,
                category: i.category,
                description: i.description,
            })),
        }));

        const result = await sendWeeklyMenuNotificationEmails(
            weekLabel,
            days,
            users.map(u => ({ email: u.email!, name: u.name }))
        );

        return result;
    } catch (error) {
        console.error('[sendWeeklyMenu] Error:', error);
        return { success: false, error: 'Erreur serveur lors de la notification hebdomadaire.' };
    }
}

/**
 * Verrouille ou déverrouille manuellement les commandes pour un menu.
 * Quand locked=true, aucune nouvelle commande ne peut être passée,
 * même si la deadline automatique n'est pas encore atteinte.
 */
export async function setMenuLockedAction(menuId: string, locked: boolean) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return { success: false, error: 'Accès non autorisé.' };
    }

    try {
        // @ts-ignore — locked sera disponible après prisma db push
        await prisma.menu.update({
            where: { id: menuId },
            data: { locked },
        });

        revalidatePath('/admin/orders');
        revalidatePath('/admin/menus');
        revalidatePath('/menu');
        return { success: true, locked };
    } catch (error) {
        console.error('[setMenuLocked] Error:', error);
        return { success: false, error: 'Erreur lors du verrouillage du menu.' };
    }
}
