import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OrdersClient from "./OrdersClient";

export const dynamic = 'force-dynamic';

export default async function OrderHistoryPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/api/auth/signin");

    const orders = await prisma.order.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
            menu: true,
            items: {
                include: {
                    item: {
                        include: {
                            optionGroups: {
                                include: { options: true }
                            }
                        }
                    },
                    itemRating: true,
                }
            },
            review: {
                include: {
                    itemRatings: true,
                }
            }
        }
    });

    return <OrdersClient orders={orders as any} />;
}
