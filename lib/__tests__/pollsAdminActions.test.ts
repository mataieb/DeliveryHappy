import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
    prisma: {
        poll: {
            create:     vi.fn(),
            update:     vi.fn(),
            delete:     vi.fn(),
            updateMany: vi.fn(),
        },
        pollVote: {
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

import {
    createPollAction,
    updatePollStatusAction,
    deletePollAction,
    updateVoteWeightAction,
    syncPollStatusesAction,
} from '../../app/admin/polls/actions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_SESSION = { user: { id: 'admin-1', role: 'ADMIN' } };
const USER_SESSION  = { user: { id: 'user-1',  role: 'USER'  } };

const MINIMAL_POLL_INPUT = {
    title: 'Votez pour les menus !',
    questions: [
        {
            text: 'Quel plat préférez-vous ?',
            type: 'RANKED_CHOICE' as const,
            order: 0,
            options: [
                { text: 'Salade César',     order: 0 },
                { text: 'Nouilles aux œufs', order: 1 },
            ],
        },
    ],
};

// ── createPollAction ──────────────────────────────────────────────────────────

describe('createPollAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refuse si non connecté', async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);
        const result = await createPollAction(MINIMAL_POLL_INPUT);
        expect(result.success).toBe(false);
        expect(prisma.poll.create).not.toHaveBeenCalled();
    });

    it('refuse si rôle USER', async () => {
        vi.mocked(getServerSession).mockResolvedValue(USER_SESSION as any);
        const result = await createPollAction(MINIMAL_POLL_INPUT);
        expect(result.success).toBe(false);
        expect(prisma.poll.create).not.toHaveBeenCalled();
    });

    it('crée le sondage avec questions et options si admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.poll.create).mockResolvedValue({} as any);

        const result = await createPollAction(MINIMAL_POLL_INPUT);

        expect(result.success).toBe(true);
        expect(prisma.poll.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    title: 'Votez pour les menus !',
                    questions: expect.objectContaining({ create: expect.any(Array) }),
                }),
            })
        );
    });

    it('inclut openAt et closeAt si fournis', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.poll.create).mockResolvedValue({} as any);

        const openAt  = '2026-05-01T08:00:00.000Z';
        const closeAt = '2026-05-08T20:00:00.000Z';
        await createPollAction({ ...MINIMAL_POLL_INPUT, openAt, closeAt });

        expect(prisma.poll.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    openAt:  new Date(openAt),
                    closeAt: new Date(closeAt),
                }),
            })
        );
    });

    it('retourne une erreur si Prisma échoue', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.poll.create).mockRejectedValue(new Error('DB error'));

        const result = await createPollAction(MINIMAL_POLL_INPUT);
        expect(result.success).toBe(false);
    });
});

// ── updatePollStatusAction ────────────────────────────────────────────────────

describe('updatePollStatusAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refuse si non admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue(USER_SESSION as any);
        const result = await updatePollStatusAction('poll-1', 'OPEN');
        expect(result.success).toBe(false);
        expect(prisma.poll.update).not.toHaveBeenCalled();
    });

    it('met à jour le statut vers OPEN', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.poll.update).mockResolvedValue({} as any);

        const result = await updatePollStatusAction('poll-1', 'OPEN');
        expect(result.success).toBe(true);
        expect(prisma.poll.update).toHaveBeenCalledWith({
            where: { id: 'poll-1' },
            data:  { status: 'OPEN' },
        });
    });

    it('met à jour le statut vers CLOSED', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.poll.update).mockResolvedValue({} as any);

        const result = await updatePollStatusAction('poll-1', 'CLOSED');
        expect(result.success).toBe(true);
        expect(prisma.poll.update).toHaveBeenCalledWith({
            where: { id: 'poll-1' },
            data:  { status: 'CLOSED' },
        });
    });
});

// ── deletePollAction ──────────────────────────────────────────────────────────

describe('deletePollAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refuse si non admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue(USER_SESSION as any);
        const result = await deletePollAction('poll-1');
        expect(result.success).toBe(false);
        expect(prisma.poll.delete).not.toHaveBeenCalled();
    });

    it('supprime le sondage si admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.poll.delete).mockResolvedValue({} as any);

        const result = await deletePollAction('poll-1');
        expect(result.success).toBe(true);
        expect(prisma.poll.delete).toHaveBeenCalledWith({ where: { id: 'poll-1' } });
    });
});

// ── updateVoteWeightAction ────────────────────────────────────────────────────

describe('updateVoteWeightAction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('refuse si non admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue(USER_SESSION as any);
        const result = await updateVoteWeightAction('vote-1', 2.0);
        expect(result.success).toBe(false);
        expect(prisma.pollVote.update).not.toHaveBeenCalled();
    });

    it('met à jour le poids du vote si admin', async () => {
        vi.mocked(getServerSession).mockResolvedValue(ADMIN_SESSION as any);
        vi.mocked(prisma.pollVote.update).mockResolvedValue({ pollId: 'poll-1' } as any);

        const result = await updateVoteWeightAction('vote-1', 2.5);
        expect(result.success).toBe(true);
        expect(prisma.pollVote.update).toHaveBeenCalledWith({
            where: { id: 'vote-1' },
            data:  { weight: 2.5 },
        });
    });
});

// ── syncPollStatusesAction ────────────────────────────────────────────────────

describe('syncPollStatusesAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => vi.useRealTimers());

    it('passe les sondages DRAFT dont openAt est dépassé en OPEN', async () => {
        vi.setSystemTime(new Date('2026-05-10T12:00:00.000Z'));
        vi.mocked(prisma.poll.updateMany).mockResolvedValue({ count: 1 } as any);

        await syncPollStatusesAction();

        expect(prisma.poll.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: 'DRAFT' }),
                data:  { status: 'OPEN' },
            })
        );
    });

    it('passe les sondages OPEN dont closeAt est dépassé en CLOSED', async () => {
        vi.setSystemTime(new Date('2026-05-10T12:00:00.000Z'));
        vi.mocked(prisma.poll.updateMany).mockResolvedValue({ count: 1 } as any);

        await syncPollStatusesAction();

        expect(prisma.poll.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: 'OPEN' }),
                data:  { status: 'CLOSED' },
            })
        );
    });

    it('utilise la date courante comme seuil', async () => {
        const NOW = new Date('2026-06-01T09:00:00.000Z');
        vi.setSystemTime(NOW);
        vi.mocked(prisma.poll.updateMany).mockResolvedValue({ count: 0 } as any);

        await syncPollStatusesAction();

        const calls = vi.mocked(prisma.poll.updateMany).mock.calls;
        calls.forEach(([args]) => {
            expect((args as any).where.openAt?.lte ?? (args as any).where.closeAt?.lte).toEqual(NOW);
        });
    });
});
