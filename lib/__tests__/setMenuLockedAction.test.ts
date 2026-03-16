import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
    prisma: {
        menu: {
            update: vi.fn(),
        },
    },
}));

vi.mock('next-auth/next', () => ({
    getServerSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
    authOptions: {},
}));

vi.mock('@/lib/email', () => ({
    sendMenuNotificationEmails: vi.fn(),
    sendWeeklyMenuNotificationEmails: vi.fn(),
}));

import { setMenuLockedAction } from '../../app/admin/menus/actions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('setMenuLockedAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne une erreur si l\'utilisateur n\'est pas connecté', async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);
        const result = await setMenuLockedAction('menu-1', true);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/autorisé/i);
        expect(prisma.menu.update).not.toHaveBeenCalled();
    });

    it('retourne une erreur si l\'utilisateur est un USER (pas ADMIN)', async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'user-1', role: 'USER' }
        } as any);
        const result = await setMenuLockedAction('menu-1', true);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/autorisé/i);
        expect(prisma.menu.update).not.toHaveBeenCalled();
    });

    it('verrouille le menu avec succès si admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'admin-1', role: 'ADMIN' }
        } as any);
        vi.mocked(prisma.menu.update).mockResolvedValue({} as any);

        const result = await setMenuLockedAction('menu-abc', true);
        expect(result.success).toBe(true);
        expect(result.locked).toBe(true);
        expect(prisma.menu.update).toHaveBeenCalledWith({
            where: { id: 'menu-abc' },
            data: { locked: true },
        });
    });

    it('déverrouille le menu avec succès si admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'admin-1', role: 'ADMIN' }
        } as any);
        vi.mocked(prisma.menu.update).mockResolvedValue({} as any);

        const result = await setMenuLockedAction('menu-abc', false);
        expect(result.success).toBe(true);
        expect(result.locked).toBe(false);
        expect(prisma.menu.update).toHaveBeenCalledWith({
            where: { id: 'menu-abc' },
            data: { locked: false },
        });
    });

    it('retourne une erreur si prisma échoue', async () => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'admin-1', role: 'ADMIN' }
        } as any);
        vi.mocked(prisma.menu.update).mockRejectedValue(new Error('DB error'));

        const result = await setMenuLockedAction('menu-abc', true);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/verrouillage/i);
    });
});
