import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import PollVoteClient from './PollVoteClient';
import { syncPollStatusesAction } from '@/app/admin/polls/actions';

export const dynamic = 'force-dynamic';

export default async function PollPage({ params }: { params: Promise<{ pollId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect('/login');

    await syncPollStatusesAction();

    const { pollId } = await params;

    const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
            questions: {
                orderBy: { order: 'asc' },
                include: { options: { orderBy: { order: 'asc' } } },
            },
        },
    });

    if (!poll || poll.status === 'DRAFT') notFound();

    const existingVote = await prisma.pollVote.findUnique({
        where: { pollId_userId: { pollId, userId: session.user.id } },
        include: {
            answers: {
                include: { selections: true },
            },
        },
    });

    return <PollVoteClient poll={poll} existingVote={existingVote} />;
}
