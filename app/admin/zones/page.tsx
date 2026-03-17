import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getZonesAction } from './actions';
import { ZonesClient } from './ZonesClient';

export const dynamic = 'force-dynamic';

export default async function ZonesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/');
    }

    const zones = await getZonesAction();

    return <ZonesClient initialZones={zones} />;
}
