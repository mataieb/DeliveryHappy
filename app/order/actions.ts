'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type OrderedItem = { id: string; option?: string };

export async function createOrderAction(menuId: string, items: OrderedItem[], deliveryAddress: string, notes?: string, dietaryOption?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Vous devez être connecté" };

    if (items.length === 0) return { success: false, error: "Aucun plat sélectionné" };
    if (!deliveryAddress) return { success: false, error: "Adresse de livraison requise" };

    try {
        // Calculate total
        const itemIds = items.map(i => i.id);
        const dbItems = await prisma.menuItem.findMany({
            where: { id: { in: itemIds } }
        });

        const total = dbItems.reduce((sum, item) => sum + item.price, 0);

        await prisma.order.create({
            data: {
                userId: session.user.id,
                menuId,
                deliveryAddress,
                notes,
                dietaryOption, // Global note
                total,
                status: 'PENDING',
                items: {
                    create: items.map(i => ({
                        itemId: i.id,
                        selectedOption: i.option
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
