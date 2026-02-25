import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import OrderClient from "./OrderClient";
import { getAllSettingsAction } from "@/app/admin/settings/actions";

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ menuId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/api/auth/signin");

    const { menuId } = await params;

    const [menu, user, settings] = await Promise.all([
        prisma.menu.findUnique({
            where: { id: menuId },
            include: {
                items: {
                    include: {
                        optionGroups: {
                            include: { options: true }
                        }
                    }
                }
            },
        }),
        prisma.user.findUnique({
            where: { id: session.user.id },
            include: { addresses: true },
        }),
        getAllSettingsAction(),
    ]);

    if (!menu) notFound();
    if (!user) redirect("/api/auth/signin");

    // @ts-ignore
    const currentBalance = user.containerBalance || 0;

    // Calculate projected balance based on previous active orders
    const activeOrders = await prisma.order.findMany({
        where: {
            userId: session.user.id,
            status: { in: ['PENDING', 'IN_KITCHEN', 'IN_DELIVERY'] },
            menu: { date: { lt: menu.date } }
        },
        // @ts-ignore
        select: { status: true, packaging: true, isReturningContainer: true }
    });

    let projectedBalance = currentBalance;
    for (const o of activeOrders) {
        // @ts-ignore
        if (o.packaging === 'TUPPERWARE' && ['PENDING', 'IN_KITCHEN'].includes(o.status)) projectedBalance++;
        // @ts-ignore
        if (o.isReturningContainer) projectedBalance--;
    }
    projectedBalance = Math.max(0, projectedBalance);

    // @ts-ignore
    return <OrderClient
        menu={menu}
        addresses={user.addresses}
        containerBalance={projectedBalance}
        userPhoneNumber={user.phoneNumber}
        tupperwareEnabled={settings.tupperwareEnabled}
    />;
}
