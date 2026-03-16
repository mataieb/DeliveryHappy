'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isOrderingOpen } from "@/lib/ordering";

export type ItemRatingInput = {
    orderItemId: string;
    rating: number; // 1-5
};

export async function submitOrderReviewAction(
    orderId: string,
    itemRatings: ItemRatingInput[],
    comment?: string
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Vous devez être connecté" };

    // Verify the order belongs to the user and is in a reviewable state
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true, status: true, review: { select: { id: true } } }
    });

    if (!order) return { success: false, error: "Commande introuvable" };
    if (order.userId !== session.user.id) return { success: false, error: "Non autorisé" };
    if (!['DELIVERED', 'PAID'].includes(order.status)) {
        return { success: false, error: "Seules les commandes livrées ou payées peuvent être notées" };
    }
    if (order.review) return { success: false, error: "Cette commande a déjà été notée" };

    // Validate ratings
    for (const r of itemRatings) {
        if (r.rating < 1 || r.rating > 5) {
            return { success: false, error: "Les notes doivent être entre 1 et 5" };
        }
    }

    try {
        await prisma.orderReview.create({
            data: {
                orderId,
                comment: comment?.trim() || null,
                itemRatings: {
                    create: itemRatings.map(r => ({
                        orderItemId: r.orderItemId,
                        rating: r.rating,
                    }))
                }
            }
        });

        revalidatePath('/orders');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Erreur lors de l'enregistrement de l'avis" };
    }
}

/**
 * Annule une commande par l'utilisateur lui-même.
 * Conditions :
 *  - La commande appartient à l'utilisateur connecté
 *  - Le statut est PENDING (pas encore en cuisine)
 *  - La deadline de commande n'est pas encore passée
 */
export async function cancelOrderAction(orderId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Vous devez être connecté" };

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { menu: { select: { date: true } } }
    });

    if (!order) return { success: false, error: "Commande introuvable" };
    if (order.userId !== session.user.id) return { success: false, error: "Non autorisé" };

    // Seules les commandes PENDING peuvent être annulées par l'utilisateur
    if (order.status !== 'PENDING') {
        return {
            success: false,
            error: "Seules les commandes en attente peuvent être annulées. Contactez le service pour toute autre demande."
        };
    }

    // Vérifie que la deadline n'est pas passée
    if (!isOrderingOpen(order.menu.date)) {
        return {
            success: false,
            error: "La deadline de commande est passée, il n'est plus possible d'annuler."
        };
    }

    try {
        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' }
        });

        revalidatePath('/orders');
        revalidatePath('/admin/orders');
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Erreur lors de l'annulation" };
    }
}
