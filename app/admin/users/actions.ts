'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function changeUserRoleAction(userId: string, newRole: 'USER' | 'ADMIN') {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: "Non autorisé" };
    }

    if (userId === session.user.id) {
        return { success: false, error: "Vous ne pouvez pas modifier votre propre rôle" };
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role: newRole as any },
        });
        revalidatePath('/admin/users');
        return { success: true };
    } catch {
        return { success: false, error: "Erreur lors de la mise à jour" };
    }
}
