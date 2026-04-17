import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PollsAdminClient from './PollsAdminClient';
import { syncPollStatusesAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminPollsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') redirect('/');

    await syncPollStatusesAction();

    const [polls, dishes] = await Promise.all([
        prisma.poll.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                    include: { options: { orderBy: { order: 'asc' } } },
                },
                _count: { select: { votes: true } },
            },
        }),
        prisma.dishLibraryItem.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, imageUrl: true, category: true },
        }),
    ]);

    return <PollsAdminClient polls={polls} dishes={dishes} />;
}
