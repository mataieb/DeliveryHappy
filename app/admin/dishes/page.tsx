import { prisma } from '@/lib/prisma';
import DishesClient from './DishesClient';

export const dynamic = 'force-dynamic';

export default async function DishesPage() {
    const dishes = await prisma.dishLibraryItem.findMany({
        orderBy: { name: 'asc' },
        include: {
            optionGroups: {
                include: { options: true },
            },
        },
    });

    return <DishesClient dishes={dishes} />;
}
