import { Container, Title } from "@mantine/core";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrdersClient } from "./OrdersClient";

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect("/");
    }

    const orders = await prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            user: true,
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
                include: { itemRatings: true }
            }
        }
    });

    return (
        <Container fluid>
            <Title order={2} mb="lg">Gestion des Commandes</Title>
            <OrdersClient orders={orders} />
        </Container>
    );
}
