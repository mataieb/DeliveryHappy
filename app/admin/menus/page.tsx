import { prisma } from '@/lib/prisma';
import MenusClient from './MenusClient';

export const dynamic = 'force-dynamic'; // Ensure we always fetch latest data

export default async function MenusPage() {
    const menus = await prisma.menu.findMany({
        orderBy: { date: 'desc' },
        include: {
            items: {
                include: {
                    optionGroups: {
                        include: {
                            options: true
                        }
                    }
                }
            }
        },
    });

    return <MenusClient menus={menus} />;
}
