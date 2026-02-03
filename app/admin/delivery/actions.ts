'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import dayjs from "dayjs";

export async function startDeliveryForDateAction(menuId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: "Non autorisé" };
    }

    try {
        // Get all orders for this menu that are ready for delivery
        const orders = await prisma.order.findMany({
            where: {
                menuId: menuId,
                status: {
                    in: ['PENDING', 'IN_KITCHEN']
                }
            }
        });

        if (orders.length === 0) {
            return { success: false, error: "Aucune commande à livrer pour ce menu" };
        }

        // Update all orders to IN_DELIVERY
        await prisma.order.updateMany({
            where: {
                menuId: menuId,
                status: {
                    in: ['PENDING', 'IN_KITCHEN']
                }
            },
            data: {
                status: 'IN_DELIVERY'
            }
        });

        revalidatePath('/admin/delivery');
        revalidatePath('/admin/orders');

        return {
            success: true,
            message: `${orders.length} commande(s) passée(s) en livraison`
        };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors du démarrage des livraisons" };
    }
}

export async function markOrdersAsKitchenAction(menuId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: "Non autorisé" };
    }

    try {
        const orders = await prisma.order.findMany({
            where: {
                menuId: menuId,
                status: 'PENDING'
            }
        });

        if (orders.length === 0) {
            return { success: false, error: "Aucune commande en attente pour ce menu" };
        }

        await prisma.order.updateMany({
            where: {
                menuId: menuId,
                status: 'PENDING'
            },
            data: {
                status: 'IN_KITCHEN'
            }
        });

        revalidatePath('/admin/delivery');
        revalidatePath('/admin/orders');

        return {
            success: true,
            message: `${orders.length} commande(s) passée(s) en cuisine`
        };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors du passage en cuisine" };
    }
}
