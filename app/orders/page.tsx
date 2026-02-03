import { Container, Title, Text, Card, Group, Badge, Stack, Grid } from "@mantine/core";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import dayjs from "dayjs";

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
                include: { item: true }
            }
        }
    });

    return (
        <Container size="md" py="xl">
            <Title mb="xl">Mes Commandes</Title>

            {orders.length === 0 ? (
                <Text c="dimmed">Vous n'avez pas encore passé de commande.</Text>
            ) : (
                <Stack>
                    {orders.map(order => (
                        <Card key={order.id} withBorder shadow="sm" radius="md">
                            <Group justify="space-between" mb="xs">
                                <Group>
                                    <Text fw={700}>Commande du {dayjs(order.menu.date).format('DD/MM/YYYY')}</Text>
                                    <Badge color={order.status === 'PENDING' ? 'blue' : order.status === 'DELIVERED' ? 'green' : 'gray'}>
                                        {order.status}
                                    </Badge>
                                </Group>
                                <Text fw={700} c="blue">{order.total.toFixed(2)} €</Text>
                            </Group>

                            <Text size="sm" c="dimmed" mb="md">
                                Livraison à : {order.deliveryAddress}
                            </Text>

                            <Stack gap="xs">
                                {order.items.map(orderItem => (
                                    <Group key={orderItem.id} justify="space-between">
                                        <div>
                                            <Text size="sm">{orderItem.item.name}</Text>
                                            {/* @ts-ignore -- selectedOption might trigger TS until regen */}
                                            {orderItem.selectedOption && (
                                                <Text size="xs" c="dimmed" fs="italic">
                                                    Option: {orderItem.selectedOption === 'VEGETARIAN' ? 'Végétarien' :
                                                        orderItem.selectedOption === 'VEGAN' ? 'Végan' :
                                                            orderItem.selectedOption === 'HALAL' ? 'Halal' :
                                                                orderItem.selectedOption === 'GLUTEN_FREE' ? 'Sans Gluten' :
                                                                    orderItem.selectedOption === 'SPICY' ? 'Épicé' :
                                                                        orderItem.selectedOption}
                                                </Text>
                                            )}
                                        </div>
                                        <Text size="sm">{orderItem.item.price} €</Text>
                                    </Group>
                                ))}
                            </Stack>
                            {/* @ts-ignore -- notes and dietaryOption might trigger TS until regen */}
                            {(order.notes || order.dietaryOption) && (
                                <Card bg="gray.0" mt="md" p="xs" radius="sm">
                                    {order.dietaryOption && <Text size="xs"><strong>Option:</strong> {order.dietaryOption}</Text>}
                                    {order.notes && <Text size="xs"><strong>Notes:</strong> {order.notes}</Text>}
                                </Card>
                            )}
                        </Card>
                    ))}
                </Stack>
            )}
        </Container>
    );
}
