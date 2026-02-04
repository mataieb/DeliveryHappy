'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function manualDecrementAction(userId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: "Non autorisé" };
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { containerBalance: { decrement: 1 } }
        });

        revalidatePath('/admin/containers');
        revalidatePath('/admin/orders'); // Might affect projections
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Erreur" };
    }
}
