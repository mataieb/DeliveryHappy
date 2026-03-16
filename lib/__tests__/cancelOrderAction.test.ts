import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isOrderingOpen } from '../ordering';

// ── Mock Prisma & Next-Auth ────────────────────────────────────────────────────
// On ne teste pas la DB ici — on teste uniquement la logique métier des guards.

vi.mock('@/lib/prisma', () => ({
    prisma: {
        order: {
            findUnique: vi.fn(),
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

import { cancelOrderAction } from '../../app/orders/actions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TOMORROW = new Date();
TOMORROW.setDate(TOMORROW.getDate() + 1);
TOMORROW.setHours(12, 0, 0, 0);

const YESTERDAY = new Date();
YESTERDAY.setDate(YESTERDAY.getDate() - 1);
YESTERDAY.setHours(12, 0, 0, 0);

const mockOrder = (overrides = {}) => ({
    id: 'order-1',
    userId: 'user-1',
    status: 'PENDING',
    packaging: 'CARDBOARD',
    menu: { date: TOMORROW },
    ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('cancelOrderAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne une erreur si l\'utilisateur n\'est pas connecté', async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);
        const result = await cancelOrderAction('order-1');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/connecté/i);
    });

    it('retourne une erreur si la commande n\'existe pas', async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any);
        vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
        const result = await cancelOrderAction('order-inexistante');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/introuvable/i);
    });

    it('retourne une erreur si la commande appartient à un autre utilisateur', async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-hacker' } } as any);
        vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder() as any);
        const result = await cancelOrderAction('order-1');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/autorisé/i);
    });

    it('retourne une erreur si la commande est déjà IN_KITCHEN', async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any);
        vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder({ status: 'IN_KITCHEN' }) as any);
        const result = await cancelOrderAction('order-1');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/en attente/i);
    });

    it('retourne une erreur si la commande est DELIVERED', async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any);
        vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder({ status: 'DELIVERED' }) as any);
        const result = await cancelOrderAction('order-1');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/en attente/i);
    });

    it('retourne une erreur si la deadline est passée', async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any);
        // Menu date dans le passé → deadline déjà passée
        vi.mocked(prisma.order.findUnique).mockResolvedValue(
            mockOrder({ menu: { date: YESTERDAY } }) as any
        );
        const result = await cancelOrderAction('order-1');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/deadline/i);
    });

    it('annule avec succès une commande PENDING dans les délais', async () => {
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-1' } } as any);
        vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder() as any);
        vi.mocked(prisma.order.update).mockResolvedValue({} as any);

        const result = await cancelOrderAction('order-1');
        expect(result.success).toBe(true);
        expect(prisma.order.update).toHaveBeenCalledWith({
            where: { id: 'order-1' },
            data: { status: 'CANCELLED' },
        });
    });
});
