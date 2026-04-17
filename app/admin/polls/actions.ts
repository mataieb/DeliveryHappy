'use server';

import { prisma } from '@/lib/prisma';
import { PollStatus, PollQuestionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

async function assertAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error('Non autorisé');
    }
}

export type PollOptionInput = {
    text: string;
    imageUrl?: string;
    order: number;
    dishLibraryItemId?: string;
};

export type PollQuestionInput = {
    text: string;
    type: PollQuestionType;
    order: number;
    options: PollOptionInput[];
};

export type PollCreateInput = {
    title: string;
    description?: string;
    openAt?: string;  // ISO string, optionnel
    closeAt?: string; // ISO string, optionnel
    questions: PollQuestionInput[];
};

// Synchronise les statuts des sondages selon leurs dates d'ouverture/fermeture.
// Appelée au chargement des pages admin et user pour éviter un cron dédié.
export async function syncPollStatusesAction() {
    const now = new Date();
    await Promise.all([
        // DRAFT avec openAt dépassé → OPEN
        prisma.poll.updateMany({
            where: { status: 'DRAFT', openAt: { lte: now } },
            data: { status: 'OPEN' },
        }),
        // OPEN avec closeAt dépassé → CLOSED
        prisma.poll.updateMany({
            where: { status: 'OPEN', closeAt: { lte: now } },
            data: { status: 'CLOSED' },
        }),
    ]);
}

export async function createPollAction(data: PollCreateInput) {
    try {
        await assertAdmin();

        await prisma.poll.create({
            data: {
                title: data.title,
                description: data.description || null,
                openAt: data.openAt ? new Date(data.openAt) : null,
                closeAt: data.closeAt ? new Date(data.closeAt) : null,
                questions: {
                    create: data.questions.map(q => ({
                        text: q.text,
                        type: q.type,
                        order: q.order,
                        options: {
                            create: q.options.map(opt => ({
                                text: opt.text,
                                imageUrl: opt.imageUrl || null,
                                order: opt.order,
                                dishLibraryItemId: opt.dishLibraryItemId || null,
                            })),
                        },
                    })),
                },
            },
        });

        revalidatePath('/admin/polls');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Erreur serveur' };
    }
}

export async function updatePollStatusAction(pollId: string, status: PollStatus) {
    try {
        await assertAdmin();
        await prisma.poll.update({ where: { id: pollId }, data: { status } });
        revalidatePath('/admin/polls');
        revalidatePath(`/admin/polls/${pollId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Erreur serveur' };
    }
}

export async function deletePollAction(pollId: string) {
    try {
        await assertAdmin();
        await prisma.poll.delete({ where: { id: pollId } });
        revalidatePath('/admin/polls');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Erreur serveur' };
    }
}

export async function updateVoteWeightAction(voteId: string, weight: number) {
    try {
        await assertAdmin();
        const vote = await prisma.pollVote.update({
            where: { id: voteId },
            data: { weight },
        });
        revalidatePath(`/admin/polls/${vote.pollId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Erreur serveur' };
    }
}
