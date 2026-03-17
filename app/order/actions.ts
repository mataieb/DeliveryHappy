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

import { pointInPolygon, type ZonePoint } from '@/lib/geo';

export async function getMenuDeliveryZoneAction(menuId: string) {
    const menu = await prisma.menu.findUnique({
        where: { id: menuId },
        select: { deliveryZone: { select: { name: true, polygon: true } } },
    });
    if (!menu?.deliveryZone) return null;
    return {
        name: menu.deliveryZone.name,
        polygon: menu.deliveryZone.polygon as ZonePoint[],
    };
}

// @ts-ignore
export async function createOrderAction(menuId: string, items: OrderedItem[], deliveryAddress: string, packaging: 'CARDBOARD' | 'TUPPERWARE', returnedCount: number, notes?: string, dietaryOption?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Vous devez être connecté" };

    if (items.length === 0) return { success: false, error: "Aucun plat sélectionné" };
    if (!deliveryAddress) return { success: false, error: "Adresse de livraison requise" };

    try {
        const menu = await prisma.menu.findUnique({
            where: { id: menuId },
            include: { deliveryZone: true },
        });
        if (!menu) return { success: false, error: "Menu introuvable" };

        // Vérifie le verrou manuel admin
        // @ts-ignore — locked disponible après db push
        if (menu.locked) {
            return {
                success: false,
                error: "Les commandes pour ce menu ont été fermées par l'administrateur."
            };
        }

        // Vérification zone de livraison
        if (menu.deliveryZone) {
            const zone = menu.deliveryZone;
            const polygon = zone.polygon as ZonePoint[];

            // Retrouve l'adresse sélectionnée par l'utilisateur via son contenu
            const userAddresses = await prisma.address.findMany({
                where: { userId: session.user.id },
                select: { content: true, lat: true, lon: true },
            });

            const matchedAddress = userAddresses.find(a => deliveryAddress.includes(a.content));

            if (!matchedAddress?.lat || !matchedAddress?.lon) {
                // Adresse sans coordonnées (ancienne adresse non géocodée) — on laisse passer
                // mais on log pour suivi
                console.warn(`[zone-check] Adresse sans coordonnées pour userId=${session.user.id}, zone=${zone.name}`);
            } else {
                const isInZone = pointInPolygon(matchedAddress.lat, matchedAddress.lon, polygon);
                if (!isInZone) {
                    return {
                        success: false,
                        error: `Votre adresse n'est pas dans la zone de livraison "${zone.name}" pour ce menu. Choisissez une autre adresse ou attendez un menu disponible dans votre zone.`,
                    };
                }
            }
        }

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
