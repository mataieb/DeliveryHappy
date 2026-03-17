import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AddressesClient } from './AddressesClient';

export const dynamic = 'force-dynamic';

export default async function AddressesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/');
    }

    const addresses = await prisma.address.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <AddressesClient addresses={addresses as any} />;
}
