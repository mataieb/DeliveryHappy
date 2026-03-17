import { prisma } from '@/lib/prisma';
import MenusClient from './MenusClient';

export const dynamic = 'force-dynamic'; // Ensure we always fetch latest data

export default async function MenusPage() {
    const [menus, zones] = await Promise.all([
        prisma.menu.findMany({
            orderBy: { date: 'desc' },
            include: {
                items: {
                    include: {
                        optionGroups: {
                            include: { options: true },
                        },
                    },
                },
                deliveryZone: {
                    select: { id: true, name: true, color: true },
                },
            },
        }),
        prisma.deliveryZone.findMany({
            select: { id: true, name: true, color: true },
            orderBy: { name: 'asc' },
        }),
    ]);

    return <MenusClient menus={menus} zones={zones} />;
}
