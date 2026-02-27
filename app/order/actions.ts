'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type OrderedItem = {
    id: string;
    option?: string;
    selectedOptions?: Record<string, any>; // JSON structure
};

// @ts-ignore
export async function createOrderAction(menuId: string, items: OrderedItem[], deliveryAddress: string, packaging: 'CARDBOARD' | 'TUPPERWARE', returnedCount: number, notes?: string, dietaryOption?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Vous devez être connecté" };

    if (items.length === 0) return { success: false, error: "Aucun plat sélectionné" };
    if (!deliveryAddress) return { success: false, error: "Adresse de livraison requise" };

    try {
        const menu = await prisma.menu.findUnique({ where: { id: menuId } });
        if (!menu) return { success: false, error: "Menu introuvable" };

        // Check ordering deadline: orders close at 21:00 the day before
        const { isOrderingOpen, orderingDeadline } = await import('@/lib/ordering');
        if (!isOrderingOpen(menu.date)) {
            return {
                success: false,
                error: `Les commandes pour ce menu sont fermées depuis le ${orderingDeadline(menu.date)}.`
            };
        }

        // Stock Validation
        if (packaging === 'TUPPERWARE') {
            const totalStock = 45;

            // 1. Currently held by users (assumed accurate from delivered orders)
            const usersAgg = await prisma.user.aggregate({ _sum: { containerBalance: true } });
            const currentOutstanding = usersAgg._sum.containerBalance || 0;

            // 2. Future movements
            const relevantOrders = await prisma.order.findMany({
                where: {
                    status: { not: 'CANCELLED' },
                    menu: {
                        date: {
                            gt: new Date(),
                            lte: menu.date
                        }
                    }
                },
                select: { packaging: true, containersReturnedCount: true, menu: { select: { date: true } } }
            });

            // Count out
            // @ts-ignore
            const takenDelta = relevantOrders.filter(o => o.packaging === 'TUPPERWARE').length;

            // Count in
            // @ts-ignore
            const returnedDelta = relevantOrders.filter(o => o.menu.date < menu.date).reduce((acc, o) => acc + (o.containersReturnedCount || 0), 0);

            const available = totalStock - currentOutstanding - takenDelta + returnedDelta;

            if (available <= 0) {
                return { success: false, error: `Plus de Tupperwares disponibles pour le ${menu.date.toLocaleDateString()} (Stock: ${available})` };
            }
        }

        // Calculate total with Options
        const itemIds = items.map(i => i.id);
        const dbItems = await prisma.menuItem.findMany({
            where: { id: { in: itemIds } },
            include: {
                optionGroups: {
                    include: { options: true }
                }
            }
        });

        let total = 0;

        for (const item of items) {
            const dbItem = dbItems.find(i => i.id === item.id);
            if (!dbItem) continue; // Should not happen

            let itemPrice = dbItem.price;

            // Calculate Options Price
            if (item.selectedOptions) {
                for (const [groupId, selection] of Object.entries(item.selectedOptions)) {
                    const group = dbItem.optionGroups.find(g => g.id === groupId);
                    if (!group) continue;

                    const optionIds = Array.isArray(selection) ? selection : [selection];

                    for (const optId of optionIds) {
                        const opt = group.options.find(o => o.id === optId);
                        if (opt) {
                            itemPrice += opt.price;
                        }
                    }
                }
            }
            total += itemPrice;
        }

        await prisma.order.create({
            data: {
                userId: session.user.id,
                menuId,
                deliveryAddress,
                notes,
                dietaryOption, // Global note
                total,
                status: 'PENDING',
                packaging,
                // @ts-ignore
                containersReturnedCount: returnedCount,
                items: {
                    create: items.map(i => ({
                        itemId: i.id,
                        selectedOption: i.option,
                        selectedOptions: i.selectedOptions ?? undefined
                    }))
                }
            }
        });

        // Revalidate admin dashboard and potential user history
        revalidatePath('/admin/orders');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Erreur lors de la création de la commande" };
    }
}
