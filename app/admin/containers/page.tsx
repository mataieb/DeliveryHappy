import { prisma } from "@/lib/prisma";
import ContainersClient from "./ContainersClient";

export const dynamic = 'force-dynamic';

export default async function ContainersPage() {
    const totalStock = 45;

    // 1. Debtors
    // @ts-ignore
    const debtors = await prisma.user.findMany({
        where: { containerBalance: { gt: 0 } },
        orderBy: { containerBalance: 'desc' }
    });

    // @ts-ignore
    const currentOutstanding = debtors.reduce((acc, u) => acc + (u.containerBalance || 0), 0);

    // 2. Future Consumption
    const menus = await prisma.menu.findMany({
        where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }, // From today midnight
        orderBy: { date: 'asc' },
        include: {
            orders: {
                where: { status: { not: 'CANCELLED' } },
                // @ts-ignore
                select: { packaging: true, isReturningContainer: true }
            }
        }
    });

    return <ContainersClient
        debtors={debtors}
        menus={menus}
        totalStock={totalStock}
        currentOutstanding={currentOutstanding}
    />;
}
