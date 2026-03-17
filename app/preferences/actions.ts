'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DietaryOption, AddressType } from "@prisma/client";

export async function updateDietaryPreferences(preferences: DietaryOption[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Non authentifié" };

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { dietaryPreferences: preferences },
        });
        revalidatePath('/preferences');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors de la mise à jour" };
    }
}

export async function updatePhoneNumber(phoneNumber: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Non authentifié" };

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { phoneNumber },
        });
        revalidatePath('/preferences');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors de la mise à jour" };
    }
}

export async function addAddressAction(label: string, content: string, details?: string, lat?: number, lon?: number, type?: AddressType) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Non authentifié" };

    if (!label || !content) return { success: false, error: "Champs requis" };

    try {
        await prisma.address.create({
            data: {
                userId: session.user.id,
                label,
                type: type ?? 'DOMICILE',
                content,
                details,
                lat: lat ?? null,
                lon: lon ?? null,
            },
        });
        revalidatePath('/preferences');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors de la création" };
    }
}

export async function deleteAddressAction(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Non authentifié" };

    try {
        const count = await prisma.address.count({
            where: { id, userId: session.user.id },
        });
        if (count === 0) return { success: false, error: "Adresse introuvable" };

        await prisma.address.delete({ where: { id } });
        revalidatePath('/preferences');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors de la suppression" };
    }
}

export async function updateAddressAction(id: string, label: string, content: string, details?: string, lat?: number, lon?: number, type?: AddressType) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Non authentifié" };

    if (!label || !content) return { success: false, error: "Champs requis" };

    try {
        const count = await prisma.address.count({
            where: { id, userId: session.user.id },
        });
        if (count === 0) return { success: false, error: "Adresse introuvable" };

        await prisma.address.update({
            where: { id },
            data: {
                label,
                type: type ?? 'DOMICILE',
                content,
                details,
                // Mettre à jour les coordonnées seulement si fournies (sélection depuis l'autocomplete)
                ...(lat !== undefined && lon !== undefined ? { lat, lon } : {}),
            },
        });
        revalidatePath('/preferences');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erreur lors de la mise à jour" };
    }
}
