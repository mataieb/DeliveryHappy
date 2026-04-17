import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import PollDetailClient from './PollDetailClient';

export const dynamic = 'force-dynamic';

export default async function AdminPollDetailPage({ params }: { params: Promise<{ pollId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') redirect('/');

    const { pollId } = await params;

    const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
            questions: {
                orderBy: { order: 'asc' },
                include: { options: { orderBy: { order: 'asc' } } },
            },
            votes: {
                orderBy: { submittedAt: 'desc' },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    answers: {
                        include: {
                            selections: { include: { option: true } },
                        },
                    },
                },
            },
        },
    });

    if (!poll) notFound();

    return <PollDetailClient poll={poll} />;
}
