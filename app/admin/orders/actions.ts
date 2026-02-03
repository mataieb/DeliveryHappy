'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateOrderStatusAction(orderId: string, status: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: "Non autorisé" };
    }

    const validStatuses = ['PENDING', 'IN_KITCHEN', 'IN_DELIVERY', 'DELIVERED', 'PAID', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
        return { success: false, error: "Statut invalide" };
    }

    try {
        await prisma.order.update({
            where: { id: orderId },
            data: { status: status as any }
        });

        revalidatePath('/admin/orders');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors de la mise à jour" };
    }
}
