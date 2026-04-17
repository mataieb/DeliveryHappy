'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export type VoteSelectionInput = {
    optionId: string;
    rank?: number; // only for RANKED_CHOICE questions
};

export type VoteAnswerInput = {
    questionId: string;
    selections: VoteSelectionInput[];
};

export async function submitVoteAction(pollId: string, answers: VoteAnswerInput[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { success: false, error: 'Vous devez être connecté pour voter' };
    }

    try {
        const poll = await prisma.poll.findUnique({
            where: { id: pollId },
            select: { status: true },
        });

        if (!poll) return { success: false, error: 'Sondage introuvable' };
        if (poll.status !== 'OPEN') return { success: false, error: 'Ce sondage n\'est pas ouvert aux votes' };

        const existing = await prisma.pollVote.findUnique({
            where: { pollId_userId: { pollId, userId: session.user.id } },
        });
        if (existing) return { success: false, error: 'Vous avez déjà voté dans ce sondage' };

        // Filter out questions with no selections
        const nonEmptyAnswers = answers.filter(a => a.selections.length > 0);

        await prisma.pollVote.create({
            data: {
                pollId,
                userId: session.user.id,
                weight: 1.0,
                answers: {
                    create: nonEmptyAnswers.map(ans => ({
                        questionId: ans.questionId,
                        selections: {
                            create: ans.selections.map(sel => ({
                                optionId: sel.optionId,
                                rank: sel.rank ?? null,
                            })),
                        },
                    })),
                },
            },
        });

        revalidatePath(`/polls/${pollId}`);
        return { success: true };
    } catch (e: any) {
        console.error('[submitVote]', e);
        return { success: false, error: 'Erreur lors de la soumission du vote' };
    }
}
