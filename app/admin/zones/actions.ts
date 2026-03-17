'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type ZonePoint = { lat: number; lon: number };

export type DeliveryZoneRow = {
    id: string;
    name: string;
    color: string;
    polygon: ZonePoint[];
    createdAt: Date;
    menuCount: number;
};

export async function getZonesAction(): Promise<DeliveryZoneRow[]> {
    const zones = await prisma.deliveryZone.findMany({
        include: { _count: { select: { menus: true } } },
        orderBy: { createdAt: 'asc' },
    });

    return zones.map(z => ({
        id: z.id,
        name: z.name,
        color: z.color,
        polygon: z.polygon as ZonePoint[],
        createdAt: z.createdAt,
        menuCount: z._count.menus,
    }));
}

export async function createZoneAction(name: string, color: string, polygon: ZonePoint[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: 'Non autorisé' };
    }

    if (!name.trim()) return { success: false, error: 'Nom requis' };
    if (polygon.length < 3) return { success: false, error: 'Au moins 3 points requis' };

    await prisma.deliveryZone.create({
        data: { name: name.trim(), color, polygon: polygon as any },
    });

    revalidatePath('/admin/zones');
    return { success: true };
}

export async function deleteZoneAction(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: 'Non autorisé' };
    }

    // Les menus liés auront deliveryZoneId mis à null (onDelete: SetNull)
    await prisma.deliveryZone.delete({ where: { id } });

    revalidatePath('/admin/zones');
    return { success: true };
}
