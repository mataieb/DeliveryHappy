'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// @ts-ignore
export async function updateOrderStatusAction(orderId: string, status: string, confirmedReturnCount: number = 0) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: "Non autorisé" };
    }

    const validStatuses = ['PENDING', 'IN_KITCHEN', 'IN_DELIVERY', 'DELIVERED', 'PAID', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
        return { success: false, error: "Statut invalide" };
    }

    try {
        // Fetch current order state before update
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { userId: true, status: true, packaging: true, isReturningContainer: true, containersReturnedCount: true }
        });

        if (!order) return { success: false, error: "Commande introuvable" };

        await prisma.$transaction(async (tx) => {
            // 1. Update Order Status
            await tx.order.update({
                where: { id: orderId },
                data: { status: status as any }
            });

            // 2. Handle Tupperware Lifecycle

            // Trigger: Leaving Kitchen / Start Delivery -> User gets a Tupperware
            // Condition: New Status is IN_DELIVERY AND Old Status was NOT IN_DELIVERY (prevent double count if clicking same button)
            // And packaging must be TUPPERWARE
            if (status === 'IN_DELIVERY' && order.status !== 'IN_DELIVERY' && order.packaging === 'TUPPERWARE') {
                await tx.user.update({
                    where: { id: order.userId },
                    data: { containerBalance: { increment: 1 } }
                });
            }

            // Trigger: Delivery Complete -> User returned X Tupperwares
            // Condition: New Status is DELIVERED
            // Only if confirmedReturnCount > 0 passed from UI
            if (status === 'DELIVERED' && confirmedReturnCount > 0) {
                await tx.user.update({
                    where: { id: order.userId },
                    data: { containerBalance: { decrement: confirmedReturnCount } }
                });
                // Note: We could store the "actual confirmed returned" in the order too if we wanted audit history,
                // but currently we just rely on updating the user balance.
                // It might be wise to update 'containersReturnedCount' on the order with the confirmed amount?
                // Let's do it for consistency.
                await tx.order.update({
                    where: { id: orderId },
                    data: { containersReturnedCount: confirmedReturnCount }
                });
            }
        });

        revalidatePath('/admin/orders');
        revalidatePath('/admin/containers');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors de la mise à jour" };
    }
}
