'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// ─── Helper ──────────────────────────────────────────────────────────────────

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session?.user?.id || session?.user?.role !== 'ADMIN') {
        throw new Error('Unauthorized');
    }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getSettingAction(key: string): Promise<string | null> {
    const setting = await prisma.appSetting.findUnique({ where: { key } });
    return setting?.value ?? null;
}

/**
 * Returns all app settings as a typed object.
 * Defaults are applied if a key hasn't been set yet.
 */
export async function getAllSettingsAction(): Promise<{
    tupperwareEnabled: boolean;
}> {
    const settings = await prisma.appSetting.findMany();
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]));

    return {
        tupperwareEnabled: map['tupperware_enabled'] !== 'false', // default: true
    };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function setTupperwareEnabledAction(enabled: boolean) {
    await requireAdmin();

    await prisma.appSetting.upsert({
        where: { key: 'tupperware_enabled' },
        create: { key: 'tupperware_enabled', value: String(enabled) },
        update: { value: String(enabled) },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/order', 'layout'); // Invalidate all order pages
    return { success: true };
}
