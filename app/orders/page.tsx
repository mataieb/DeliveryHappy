import { Container, Title, Text, Card, Group, Badge, Stack } from "@mantine/core";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import dayjs from "dayjs";
import 'dayjs/locale/fr';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'En attente',
    IN_KITCHEN: 'En préparation',
    IN_DELIVERY: 'En livraison',
    DELIVERED: 'Livrée',
    PAID: 'Payée',
    CANCELLED: 'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'blue',
    IN_KITCHEN: 'orange',
    IN_DELIVERY: 'yellow',
    DELIVERED: 'green',
    PAID: 'teal',
    CANCELLED: 'red',
};

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
                    }
                }
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
                                    <Text fw={700}>Commande du {dayjs(order.menu.date).locale('fr').format('DD/MM/YYYY')}</Text>
                                    <Badge color={STATUS_COLORS[order.status] ?? 'gray'}>
                                        {STATUS_LABELS[order.status] ?? order.status}
                                    </Badge>
                                </Group>
                                <Text fw={700} c="blue">{order.total.toFixed(2)} €</Text>
                            </Group>

                            <Group gap="xs" mb="md">
                                <Text size="sm" c="dimmed">Livraison à : {order.deliveryAddress}</Text>
                                <Badge variant="outline" color="gray" size="sm">
                                    {order.packaging === 'TUPPERWARE' ? '🍱 Tupperware' : '📦 Carton'}
                                </Badge>
                                {order.isReturningContainer && (
                                    <Badge variant="outline" color="orange" size="sm">
                                        ↩️ Retour Tupperware ({order.containersReturnedCount})
                                    </Badge>
                                )}
                            </Group>

                            <Stack gap="xs">
                                {order.items.map(orderItem => (
                                    <Group key={orderItem.id} justify="space-between" align="flex-start">
                                        <div>
                                            <Text size="sm" fw={500}>{orderItem.item.name}</Text>

                                            <Group gap={4} mt={4}>
                                                {/* Legacy Option */}
                                                {/* @ts-ignore */}
                                                {orderItem.selectedOption && (
                                                    <Badge size="xs" variant="light" color={
                                                        orderItem.selectedOption === 'VEGETARIAN' ? 'green' :
                                                            orderItem.selectedOption === 'VEGAN' ? 'teal' :
                                                                orderItem.selectedOption === 'HALAL' ? 'grape' :
                                                                    orderItem.selectedOption === 'GLUTEN_FREE' ? 'yellow' :
                                                                        orderItem.selectedOption === 'SPICY' ? 'red' : 'gray'
                                                    }>
                                                        {orderItem.selectedOption === 'VEGETARIAN' ? 'Végétarien' :
                                                            orderItem.selectedOption === 'VEGAN' ? 'Végan' :
                                                                orderItem.selectedOption === 'HALAL' ? 'Halal' :
                                                                    orderItem.selectedOption === 'GLUTEN_FREE' ? 'Sans Gluten' :
                                                                        orderItem.selectedOption === 'SPICY' ? 'Épicé' :
                                                                            orderItem.selectedOption}
                                                    </Badge>
                                                )}

                                                {/* Complex Options */}
                                                {/* @ts-ignore */}
                                                {orderItem.selectedOptions && orderItem.item.optionGroups && (
                                                    <>
                                                        {/* @ts-ignore */}
                                                        {Object.entries(orderItem.selectedOptions).map(([groupId, selection]) => {
                                                            const group = orderItem.item.optionGroups.find(g => g.id === groupId);
                                                            if (!group) return null;

                                                            const ids = Array.isArray(selection) ? selection : [selection];
                                                            // @ts-ignore
                                                            const options = ids.map((id: any) => group.options.find(o => o.id === id)).filter((o) => !!o) as any[];

                                                            if (options.length === 0) return null;

                                                            return options.map(opt => {
                                                                let color = 'gray';
                                                                const lowerName = opt.name.toLowerCase();
                                                                const lowerGroup = group.name.toLowerCase();

                                                                if (lowerName.includes('végé')) color = 'green';
                                                                else if (lowerName.includes('végan')) color = 'teal';
                                                                else if (lowerName.includes('halal')) color = 'grape'; // strictly checks opt name first
                                                                else if (lowerName.includes('gluten') || lowerGroup.includes('gluten')) color = 'yellow';
                                                                else if (lowerName.includes('épicé') || lowerGroup.includes('épice')) color = 'red';
                                                                else if (lowerGroup.includes('protéine')) color = 'blue';

                                                                return (
                                                                    <Badge key={opt.id} size="xs" variant="light" color={color}>
                                                                        {opt.name}
                                                                    </Badge>
                                                                );
                                                            });
                                                        })}
                                                    </>
                                                )}
                                            </Group>
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
