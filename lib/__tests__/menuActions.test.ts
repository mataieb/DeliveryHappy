import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
    prisma: {
        menu:     { count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
        menuItem: { findMany: vi.fn(), deleteMany: vi.fn(), update: vi.fn(), create: vi.fn() },
        optionGroup: { deleteMany: vi.fn() },
        user:     { findMany: vi.fn() },
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
    sendMenuNotificationEmails:       vi.fn(),
    sendWeeklyMenuNotificationEmails: vi.fn(),
}));

// dayjs needs real implementation (date formatting used in sendMenuNotification)
vi.mock('dayjs/locale/fr', () => ({}));

import {
    createMenuAction,
    deleteMenuAction,
    updateMenuAction,
    copyMenuAction,
    sendMenuNotificationAction,
    sendWeeklyMenuNotificationAction,
} from '../../app/admin/menus/actions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { sendMenuNotificationEmails, sendWeeklyMenuNotificationEmails } from '@/lib/email';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_SESSION = { user: { id: 'admin-1', role: 'ADMIN' } };
const USER_SESSION  = { user: { id: 'user-1',  role: 'USER'  } };

const TARGET_DATE = new Date('2026-05-12T00:00:00.000Z');

const MINIMAL_ITEM = {
    name: 'Salade César',
    description: 'La classique',
    ingredients: 'Laitue, parmesan',
    price: 8.5,
    category: 'MAIN' as const,
    dietaryOptions: [] as any[],
    optionGroups: [],
};

const ITEM_WITH_OPTIONS = {
    ...MINIMAL_ITEM,
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

// ── createMenuAction ──────────────────────────────────────────────────────────

describe('createMenuAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refuse si un menu existe déjà à cette date', async () => {
        vi.mocked(prisma.menu.count).mockResolvedValue(1);

        const result = await createMenuAction(TARGET_DATE, [MINIMAL_ITEM]);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/existe déjà/i);
        expect(prisma.menu.create).not.toHaveBeenCalled();
    });

    it('crée le menu si la date est libre', async () => {
        vi.mocked(prisma.menu.count).mockResolvedValue(0);
        vi.mocked(prisma.menu.create).mockResolvedValue({} as any);

        const result = await createMenuAction(TARGET_DATE, [MINIMAL_ITEM]);
        expect(result.success).toBe(true);
        expect(prisma.menu.create).toHaveBeenCalledOnce();
    });

    it('normalise la date à minuit', async () => {
        vi.mocked(prisma.menu.count).mockResolvedValue(0);
        vi.mocked(prisma.menu.create).mockResolvedValue({} as any);

        const dateWithTime = new Date('2026-05-12T14:30:00.000Z');
        await createMenuAction(dateWithTime, [MINIMAL_ITEM]);

        const createArg = vi.mocked(prisma.menu.create).mock.calls[0][0] as any;
        expect(createArg.data.date.getHours()).toBe(0);
        expect(createArg.data.date.getMinutes()).toBe(0);
        expect(createArg.data.date.getSeconds()).toBe(0);
    });

    it('crée les items avec groupes d\'options imbriqués', async () => {
        vi.mocked(prisma.menu.count).mockResolvedValue(0);
        vi.mocked(prisma.menu.create).mockResolvedValue({} as any);

        await createMenuAction(TARGET_DATE, [ITEM_WITH_OPTIONS]);

        const createArg = vi.mocked(prisma.menu.create).mock.calls[0][0] as any;
        const item = createArg.data.items.create[0];
        expect(item.name).toBe('Salade César');
        const group = item.optionGroups.create[0];
        expect(group.name).toBe('Taille');
        expect(group.options.create).toHaveLength(2);
        expect(group.options.create[1]).toMatchObject({ name: 'Grande', price: 2 });
    });

    it('associe la deliveryZoneId si fournie', async () => {
        vi.mocked(prisma.menu.count).mockResolvedValue(0);
        vi.mocked(prisma.menu.create).mockResolvedValue({} as any);

        await createMenuAction(TARGET_DATE, [MINIMAL_ITEM], 'zone-42');

        const createArg = vi.mocked(prisma.menu.create).mock.calls[0][0] as any;
        expect(createArg.data.deliveryZoneId).toBe('zone-42');
    });

    it('met deliveryZoneId à null si non fournie', async () => {
        vi.mocked(prisma.menu.count).mockResolvedValue(0);
        vi.mocked(prisma.menu.create).mockResolvedValue({} as any);

        await createMenuAction(TARGET_DATE, [MINIMAL_ITEM]);

        const createArg = vi.mocked(prisma.menu.create).mock.calls[0][0] as any;
        expect(createArg.data.deliveryZoneId).toBeNull();
    });

    it('retourne une erreur si Prisma échoue', async () => {
        vi.mocked(prisma.menu.count).mockResolvedValue(0);
        vi.mocked(prisma.menu.create).mockRejectedValue(new Error('DB error'));

        const result = await createMenuAction(TARGET_DATE, [MINIMAL_ITEM]);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/création/i);
    });
});

// ── deleteMenuAction ──────────────────────────────────────────────────────────

describe('deleteMenuAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('supprime le menu', async () => {
        vi.mocked(prisma.menu.delete).mockResolvedValue({} as any);

        const result = await deleteMenuAction('menu-1');
        expect(result.success).toBe(true);
        expect(prisma.menu.delete).toHaveBeenCalledWith({ where: { id: 'menu-1' } });
    });

    it('retourne une erreur si Prisma échoue (ex: lié à des commandes)', async () => {
        vi.mocked(prisma.menu.delete).mockRejectedValue(new Error('Foreign key constraint'));

        const result = await deleteMenuAction('menu-1');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/supprimer/i);
    });
});

// ── updateMenuAction ──────────────────────────────────────────────────────────

describe('updateMenuAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('met à jour la date et la zone du menu', async () => {
        vi.mocked(prisma.menu.update).mockResolvedValue({} as any);
        vi.mocked(prisma.menuItem.findMany).mockResolvedValue([]);

        await updateMenuAction('menu-1', TARGET_DATE, [], 'zone-99');

        expect(prisma.menu.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'menu-1' },
                data: expect.objectContaining({ deliveryZoneId: 'zone-99' }),
            })
        );
    });

    it('supprime les items retirés', async () => {
        vi.mocked(prisma.menu.update).mockResolvedValue({} as any);
        vi.mocked(prisma.menuItem.findMany).mockResolvedValue([
            { id: 'item-old-1' },
            { id: 'item-old-2' },
        ] as any);
        vi.mocked(prisma.menuItem.deleteMany).mockResolvedValue({ count: 2 } as any);

        // Aucun item passé → les deux existants doivent être supprimés
        await updateMenuAction('menu-1', TARGET_DATE, []);

        expect(prisma.menuItem.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ['item-old-1', 'item-old-2'] } },
        });
    });

    it('ne supprime rien si tous les items existants sont conservés', async () => {
        vi.mocked(prisma.menu.update).mockResolvedValue({} as any);
        vi.mocked(prisma.menuItem.findMany).mockResolvedValue([{ id: 'item-1' }] as any);
        vi.mocked(prisma.optionGroup.deleteMany).mockResolvedValue({ count: 0 } as any);
        vi.mocked(prisma.menuItem.update).mockResolvedValue({} as any);

        await updateMenuAction('menu-1', TARGET_DATE, [{ ...MINIMAL_ITEM, id: 'item-1' }]);

        expect(prisma.menuItem.deleteMany).not.toHaveBeenCalled();
    });

    it('met à jour un item existant (avec wipe des groupes d\'options)', async () => {
        vi.mocked(prisma.menu.update).mockResolvedValue({} as any);
        vi.mocked(prisma.menuItem.findMany).mockResolvedValue([{ id: 'item-1' }] as any);
        vi.mocked(prisma.optionGroup.deleteMany).mockResolvedValue({ count: 0 } as any);
        vi.mocked(prisma.menuItem.update).mockResolvedValue({} as any);

        await updateMenuAction('menu-1', TARGET_DATE, [{ ...MINIMAL_ITEM, id: 'item-1', name: 'Nouveau nom' }]);

        expect(prisma.optionGroup.deleteMany).toHaveBeenCalledWith({ where: { menuItemId: 'item-1' } });
        expect(prisma.menuItem.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'item-1' },
                data: expect.objectContaining({ name: 'Nouveau nom' }),
            })
        );
    });

    it('crée un nouvel item si pas d\'id', async () => {
        vi.mocked(prisma.menu.update).mockResolvedValue({} as any);
        vi.mocked(prisma.menuItem.findMany).mockResolvedValue([]);
        vi.mocked(prisma.menuItem.create).mockResolvedValue({} as any);

        await updateMenuAction('menu-1', TARGET_DATE, [MINIMAL_ITEM]);

        expect(prisma.menuItem.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    menuId: 'menu-1',
                    name: 'Salade César',
                }),
            })
        );
    });

    it('retourne une erreur si Prisma échoue', async () => {
        vi.mocked(prisma.menu.update).mockRejectedValue(new Error('DB error'));

        const result = await updateMenuAction('menu-1', TARGET_DATE, []);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/mise à jour/i);
    });
});

// ── copyMenuAction ────────────────────────────────────────────────────────────

describe('copyMenuAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refuse si un menu existe déjà à la date cible', async () => {
        vi.mocked(prisma.menu.count).mockResolvedValue(1);

        const result = await copyMenuAction('menu-src', TARGET_DATE);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/existe déjà/i);
        expect(prisma.menu.create).not.toHaveBeenCalled();
    });

    it('retourne une erreur si le menu source est introuvable', async () => {
        vi.mocked(prisma.menu.count).mockResolvedValue(0);
        vi.mocked(prisma.menu.findUnique).mockResolvedValue(null);

        const result = await copyMenuAction('menu-inexistant', TARGET_DATE);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/introuvable/i);
        expect(prisma.menu.create).not.toHaveBeenCalled();
    });

    it('clone le menu source avec tous ses items', async () => {
        vi.mocked(prisma.menu.count).mockResolvedValue(0);
        vi.mocked(prisma.menu.findUnique).mockResolvedValue({
            id: 'menu-src',
            date: new Date('2026-05-05'),
            items: [
                {
                    ...MINIMAL_ITEM,
                    id: 'item-src-1',
                    optionGroups: [],
                },
            ],
        } as any);
        vi.mocked(prisma.menu.create).mockResolvedValue({} as any);

        const result = await copyMenuAction('menu-src', TARGET_DATE);

        expect(result.success).toBe(true);
        const createArg = vi.mocked(prisma.menu.create).mock.calls[0][0] as any;
        expect(createArg.data.items.create).toHaveLength(1);
        expect(createArg.data.items.create[0].name).toBe('Salade César');
        // Le clone ne doit pas conserver l'id source
        expect(createArg.data.items.create[0].id).toBeUndefined();
    });

    it('clone les groupes d\'options imbriqués', async () => {
        vi.mocked(prisma.menu.count).mockResolvedValue(0);
        vi.mocked(prisma.menu.findUnique).mockResolvedValue({
            id: 'menu-src',
            date: new Date('2026-05-05'),
            items: [
                {
                    ...MINIMAL_ITEM,
                    id: 'item-src-1',
                    optionGroups: [
                        {
                            id: 'grp-1',
                            name: 'Taille',
                            isRequired: true,
                            allowMultiple: false,
                            maxOptions: null,
                            options: [
                                { id: 'opt-1', name: 'Petite', price: 0, description: null },
                                { id: 'opt-2', name: 'Grande', price: 2, description: null },
                            ],
                        },
                    ],
                },
            ],
        } as any);
        vi.mocked(prisma.menu.create).mockResolvedValue({} as any);

        await copyMenuAction('menu-src', TARGET_DATE);

        const createArg = vi.mocked(prisma.menu.create).mock.calls[0][0] as any;
        const group = createArg.data.items.create[0].optionGroups.create[0];
        expect(group.name).toBe('Taille');
        expect(group.options.create).toHaveLength(2);
        expect(group.options.create[0]).toMatchObject({ name: 'Petite', price: 0 });
    });

    it('retourne une erreur si Prisma échoue', async () => {
        vi.mocked(prisma.menu.count).mockResolvedValue(0);
        vi.mocked(prisma.menu.findUnique).mockResolvedValue({
            id: 'menu-src',
            date: new Date('2026-05-05'),
            items: [],
        } as any);
        vi.mocked(prisma.menu.create).mockRejectedValue(new Error('DB error'));

        const result = await copyMenuAction('menu-src', TARGET_DATE);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/copie/i);
    });
});

// ── sendMenuNotificationAction ────────────────────────────────────────────────

describe('sendMenuNotificationAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refuse si non connecté', async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);
        const result = await sendMenuNotificationAction('menu-1');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/autorisé/i);
        expect(sendMenuNotificationEmails).not.toHaveBeenCalled();
    });

    it('refuse si rôle USER', async () => {
        vi.mocked(getServerSession).mockResolvedValue(USER_SESSION as any);
        const result = await sendMenuNotificationAction('menu-1');
        expect(result.success).toBe(false);
        expect(sendMenuNotificationEmails).not.toHaveBeenCalled();
    });

    it('retourne une erreur si le menu est introuvable', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.menu.findUnique).mockResolvedValue(null);

        const result = await sendMenuNotificationAction('menu-inexistant');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/introuvable/i);
        expect(sendMenuNotificationEmails).not.toHaveBeenCalled();
    });

    it('envoie les notifications aux utilisateurs avec email', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.menu.findUnique).mockResolvedValue({
            id: 'menu-1',
            date: new Date('2026-05-12'),
            items: [{ name: 'Salade César', price: 8.5, category: 'MAIN', description: 'La classique' }],
        } as any);
        vi.mocked(prisma.user.findMany).mockResolvedValue([
            { email: 'alice@example.com', name: 'Alice' },
            { email: 'bob@example.com',   name: 'Bob'   },
        ] as any);
        vi.mocked(sendMenuNotificationEmails).mockResolvedValue({ success: true } as any);

        const result = await sendMenuNotificationAction('menu-1');

        expect(result.success).toBe(true);
        expect(sendMenuNotificationEmails).toHaveBeenCalledOnce();
        const [_date, items, recipients] = vi.mocked(sendMenuNotificationEmails).mock.calls[0];
        expect(items).toHaveLength(1);
        expect(items[0].name).toBe('Salade César');
        expect(recipients).toHaveLength(2);
        expect(recipients[0].email).toBe('alice@example.com');
    });

    it('retourne une erreur si l\'envoi d\'email échoue', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.menu.findUnique).mockResolvedValue({
            id: 'menu-1',
            date: new Date('2026-05-12'),
            items: [],
        } as any);
        vi.mocked(prisma.user.findMany).mockResolvedValue([]);
        vi.mocked(sendMenuNotificationEmails).mockRejectedValue(new Error('SMTP error'));

        const result = await sendMenuNotificationAction('menu-1');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/notification/i);
    });
});

// ── sendWeeklyMenuNotificationAction ─────────────────────────────────────────

describe('sendWeeklyMenuNotificationAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refuse si non admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue(USER_SESSION as any);
        const result = await sendWeeklyMenuNotificationAction(['menu-1', 'menu-2']);
        expect(result.success).toBe(false);
        expect(sendWeeklyMenuNotificationEmails).not.toHaveBeenCalled();
    });

    it('retourne une erreur si aucun menu n\'est trouvé', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.menu.findMany).mockResolvedValue([]);

        const result = await sendWeeklyMenuNotificationAction(['menu-inexistant']);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/aucun menu/i);
        expect(sendWeeklyMenuNotificationEmails).not.toHaveBeenCalled();
    });

    it('envoie les notifications hebdomadaires avec le label de semaine', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.menu.findMany).mockResolvedValue([
            {
                id: 'menu-1',
                date: new Date('2026-05-11'),
                items: [{ name: 'Salade', price: 8, category: 'MAIN', description: '' }],
            },
            {
                id: 'menu-2',
                date: new Date('2026-05-15'),
                items: [{ name: 'Pasta', price: 9, category: 'MAIN', description: '' }],
            },
        ] as any);
        vi.mocked(prisma.user.findMany).mockResolvedValue([
            { email: 'alice@example.com', name: 'Alice' },
        ] as any);
        vi.mocked(sendWeeklyMenuNotificationEmails).mockResolvedValue({ success: true } as any);

        const result = await sendWeeklyMenuNotificationAction(['menu-1', 'menu-2']);

        expect(result.success).toBe(true);
        expect(sendWeeklyMenuNotificationEmails).toHaveBeenCalledOnce();
        const [weekLabel, days, recipients] = vi.mocked(sendWeeklyMenuNotificationEmails).mock.calls[0];
        expect(weekLabel).toMatch(/du/i);   // "du X au Y"
        expect(days).toHaveLength(2);
        expect(days[0].items[0].name).toBe('Salade');
        expect(recipients[0].email).toBe('alice@example.com');
    });

    it('retourne une erreur si l\'envoi échoue', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.menu.findMany).mockResolvedValue([
            { id: 'menu-1', date: new Date('2026-05-11'), items: [] },
        ] as any);
        vi.mocked(prisma.user.findMany).mockResolvedValue([]);
        vi.mocked(sendWeeklyMenuNotificationEmails).mockRejectedValue(new Error('SMTP error'));

        const result = await sendWeeklyMenuNotificationAction(['menu-1']);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/hebdomadaire/i);
    });
});
