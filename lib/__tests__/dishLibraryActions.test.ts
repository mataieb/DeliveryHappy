import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
    prisma: {
        dishLibraryItem:  { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        dishOptionGroup:  { deleteMany: vi.fn() },
        menuItem:         { count: vi.fn() },
        orderItemRating:  { findMany: vi.fn() },
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

import {
    createDishLibraryItemAction,
    updateDishLibraryItemAction,
    deleteDishLibraryItemAction,
    getDishLibraryStatsAction,
} from '../../app/admin/dishes/actions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_SESSION = { user: { id: 'admin-1', role: 'ADMIN' } };
const USER_SESSION  = { user: { id: 'user-1',  role: 'USER'  } };

const MINIMAL_DISH = {
    name: 'Salade César',
    description: 'La classique',
    ingredients: 'Laitue, parmesan, croûtons',
    price: 8.5,
    category: 'MAIN' as const,
    dietaryOptions: [] as any[],
    optionGroups: [],
};

const DISH_WITH_OPTIONS = {
    ...MINIMAL_DISH,
    optionGroups: [
        {
            name: 'Taille',
            isRequired: true,
            allowMultiple: false,
            options: [
                { name: 'Petite', price: 0 },
                { name: 'Grande', price: 2 },
            ],
        },
    ],
};

// ── createDishLibraryItemAction ───────────────────────────────────────────────

describe('createDishLibraryItemAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refuse si non connecté', async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);
        const result = await createDishLibraryItemAction(MINIMAL_DISH);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/autorisé/i);
        expect(prisma.dishLibraryItem.create).not.toHaveBeenCalled();
    });

    it('refuse si rôle USER', async () => {
        vi.mocked(getServerSession).mockResolvedValue(USER_SESSION as any);
        const result = await createDishLibraryItemAction(MINIMAL_DISH);
        expect(result.success).toBe(false);
        expect(prisma.dishLibraryItem.create).not.toHaveBeenCalled();
    });

    it('crée le plat sans groupes d\'options', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.dishLibraryItem.create).mockResolvedValue({} as any);

        const result = await createDishLibraryItemAction(MINIMAL_DISH);

        expect(result.success).toBe(true);
        expect(prisma.dishLibraryItem.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    name: 'Salade César',
                    suggestedPrice: 8.5,
                    category: 'MAIN',
                }),
            })
        );
    });

    it('crée le plat avec groupes d\'options imbriqués', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.dishLibraryItem.create).mockResolvedValue({} as any);

        const result = await createDishLibraryItemAction(DISH_WITH_OPTIONS);

        expect(result.success).toBe(true);
        const createArg = vi.mocked(prisma.dishLibraryItem.create).mock.calls[0][0] as any;
        const group = createArg.data.optionGroups.create[0];
        expect(group.name).toBe('Taille');
        expect(group.isRequired).toBe(true);
        expect(group.options.create).toHaveLength(2);
        expect(group.options.create[1]).toMatchObject({ name: 'Grande', price: 2 });
    });

    it('retourne une erreur si Prisma échoue', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.dishLibraryItem.create).mockRejectedValue(new Error('DB error'));

        const result = await createDishLibraryItemAction(MINIMAL_DISH);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/création/i);
    });
});

// ── updateDishLibraryItemAction ───────────────────────────────────────────────

describe('updateDishLibraryItemAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refuse si non admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue(USER_SESSION as any);
        const result = await updateDishLibraryItemAction('dish-1', MINIMAL_DISH);
        expect(result.success).toBe(false);
        expect(prisma.dishLibraryItem.update).not.toHaveBeenCalled();
    });

    it('supprime les anciens groupes avant de mettre à jour', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.dishOptionGroup.deleteMany).mockResolvedValue({ count: 2 } as any);
        vi.mocked(prisma.dishLibraryItem.update).mockResolvedValue({} as any);

        await updateDishLibraryItemAction('dish-1', MINIMAL_DISH);

        // deleteMany appelé AVANT update
        const deleteManyOrder = vi.mocked(prisma.dishOptionGroup.deleteMany).mock.invocationCallOrder[0];
        const updateOrder = vi.mocked(prisma.dishLibraryItem.update).mock.invocationCallOrder[0];
        expect(deleteManyOrder).toBeLessThan(updateOrder);

        expect(prisma.dishOptionGroup.deleteMany).toHaveBeenCalledWith({
            where: { dishId: 'dish-1' },
        });
    });

    it('met à jour le plat avec les nouvelles données', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.dishOptionGroup.deleteMany).mockResolvedValue({ count: 0 } as any);
        vi.mocked(prisma.dishLibraryItem.update).mockResolvedValue({} as any);

        const result = await updateDishLibraryItemAction('dish-1', {
            ...MINIMAL_DISH,
            name: 'Salade Niçoise',
            price: 9.0,
        });

        expect(result.success).toBe(true);
        expect(prisma.dishLibraryItem.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'dish-1' },
                data: expect.objectContaining({
                    name: 'Salade Niçoise',
                    suggestedPrice: 9.0,
                }),
            })
        );
    });

    it('retourne une erreur si Prisma échoue', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.dishOptionGroup.deleteMany).mockResolvedValue({ count: 0 } as any);
        vi.mocked(prisma.dishLibraryItem.update).mockRejectedValue(new Error('DB error'));

        const result = await updateDishLibraryItemAction('dish-1', MINIMAL_DISH);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/mise à jour/i);
    });
});

// ── deleteDishLibraryItemAction ───────────────────────────────────────────────

describe('deleteDishLibraryItemAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refuse si non admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue(USER_SESSION as any);
        const result = await deleteDishLibraryItemAction('dish-1');
        expect(result.success).toBe(false);
        expect(prisma.dishLibraryItem.delete).not.toHaveBeenCalled();
    });

    it('supprime le plat si admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.dishLibraryItem.delete).mockResolvedValue({} as any);

        const result = await deleteDishLibraryItemAction('dish-1');

        expect(result.success).toBe(true);
        expect(prisma.dishLibraryItem.delete).toHaveBeenCalledWith({
            where: { id: 'dish-1' },
        });
    });

    it('retourne une erreur si Prisma échoue (plat utilisé dans un menu)', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.dishLibraryItem.delete).mockRejectedValue(
            new Error('Foreign key constraint')
        );

        const result = await deleteDishLibraryItemAction('dish-1');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/supprimer/i);
    });
});

// ── getDishLibraryStatsAction ─────────────────────────────────────────────────

describe('getDishLibraryStatsAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refuse si non admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue(USER_SESSION as any);
        const result = await getDishLibraryStatsAction('dish-1');
        expect(result.success).toBe(false);
    });

    it('retourne les stats avec note moyenne calculée', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.menuItem.count).mockResolvedValue(3);
        vi.mocked(prisma.orderItemRating.findMany).mockResolvedValue([
            { rating: 4 },
            { rating: 5 },
            { rating: 3 },
        ] as any);

        const result = await getDishLibraryStatsAction('dish-1');

        expect(result.success).toBe(true);
        expect(result.menuCount).toBe(3);
        expect(result.reviewCount).toBe(3);
        expect(result.averageRating).toBeCloseTo(4.0);
    });

    it('retourne averageRating null si aucune note', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.menuItem.count).mockResolvedValue(0);
        vi.mocked(prisma.orderItemRating.findMany).mockResolvedValue([]);

        const result = await getDishLibraryStatsAction('dish-1');

        expect(result.success).toBe(true);
        expect(result.averageRating).toBeNull();
        expect(result.reviewCount).toBe(0);
    });
});
