'use client';

import {
    Container,
    Title,
    Text,
    Card,
    Group,
    Badge,
    Stack,
    Button,
    Tooltip,
} from '@mantine/core';
import { IconStarFilled, IconStarHalfFilled, IconStar } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useState } from 'react';
import ReviewModal from './ReviewModal';

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

type OrderItemForDisplay = {
    id: string;
    selectedOption?: string | null;
    selectedOptions?: Record<string, unknown> | null;
    item: {
        id: string;
        name: string;
        price: number;
        category: string;
        optionGroups: {
            id: string;
            name: string;
            options: { id: string; name: string }[];
        }[];
    };
    itemRating?: { rating: number } | null;
};

type OrderForDisplay = {
    id: string;
    status: string;
    total: number;
    deliveryAddress: string;
    packaging: string;
    isReturningContainer: boolean;
    containersReturnedCount: number;
    notes?: string | null;
    dietaryOption?: string | null;
    menu: { date: string | Date };
    items: OrderItemForDisplay[];
    review?: {
        id: string;
        comment?: string | null;
        itemRatings: { orderItemId: string; rating: number }[];
    } | null;
};

function StarDisplay({ rating }: { rating: number }) {
    return (
        <Group gap={2}>
            {[1, 2, 3, 4, 5].map((s) => (
                s <= rating
                    ? <IconStarFilled key={s} size={14} style={{ color: 'var(--mantine-color-yellow-5)' }} />
                    : <IconStar key={s} size={14} style={{ color: 'var(--mantine-color-gray-4)' }} />
            ))}
        </Group>
    );
}

export default function OrdersClient({ orders }: { orders: OrderForDisplay[] }) {
    const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);

    const activeOrder = reviewOrderId ? orders.find(o => o.id === reviewOrderId) : null;

    const canReview = (order: OrderForDisplay) =>
        ['DELIVERED', 'PAID'].includes(order.status) && !order.review;

    return (
        <Container size="md" py="xl">
            <Title mb="xl">Mes Commandes</Title>

            {orders.length === 0 ? (
                <Text c="dimmed">Vous n&apos;avez pas encore passé de commande.</Text>
            ) : (
                <Stack>
                    {orders.map(order => (
                        <Card key={order.id} withBorder shadow="sm" radius="md">
                            <Group justify="space-between" mb="xs">
                                <Group>
                                    <Text fw={700}>
                                        Commande du {dayjs(order.menu.date).locale('fr').format('DD/MM/YYYY')}
                                    </Text>
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
                                {order.items.map(orderItem => {
                                    const itemReviewRating = order.review?.itemRatings.find(
                                        r => r.orderItemId === orderItem.id
                                    );
                                    return (
                                        <Group key={orderItem.id} justify="space-between" align="flex-start">
                                            <div>
                                                <Text size="sm" fw={500}>{orderItem.item.name}</Text>

                                                <Group gap={4} mt={4}>
                                                    {/* Legacy Option */}
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
                                                    {orderItem.selectedOptions && orderItem.item.optionGroups && (
                                                        <>
                                                            {Object.entries(orderItem.selectedOptions as Record<string, unknown>).map(([groupId, selection]) => {
                                                                const group = orderItem.item.optionGroups.find(g => g.id === groupId);
                                                                if (!group) return null;

                                                                const ids = Array.isArray(selection) ? selection : [selection];
                                                                const options = ids
                                                                    .map((id) => group.options.find(o => o.id === id))
                                                                    .filter((o): o is { id: string; name: string } => !!o);

                                                                if (options.length === 0) return null;

                                                                return options.map(opt => {
                                                                    let color = 'gray';
                                                                    const lowerName = opt.name.toLowerCase();
                                                                    const lowerGroup = group.name.toLowerCase();

                                                                    if (lowerName.includes('végé')) color = 'green';
                                                                    else if (lowerName.includes('végan')) color = 'teal';
                                                                    else if (lowerName.includes('halal')) color = 'grape';
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
                                            <Group gap="xs" align="center">
                                                {itemReviewRating && (
                                                    <StarDisplay rating={itemReviewRating.rating} />
                                                )}
                                                <Text size="sm">{orderItem.item.price} €</Text>
                                            </Group>
                                        </Group>
                                    );
                                })}
                            </Stack>

                            {(order.notes || order.dietaryOption) && (
                                <Card bg="gray.0" mt="md" p="xs" radius="sm">
                                    {order.dietaryOption && <Text size="xs"><strong>Option:</strong> {order.dietaryOption}</Text>}
                                    {order.notes && <Text size="xs"><strong>Notes:</strong> {order.notes}</Text>}
                                </Card>
                            )}

                            {/* Review section */}
                            {order.review && order.review.comment && (
                                <Card bg="yellow.0" mt="md" p="xs" radius="sm" withBorder>
                                    <Group gap="xs" mb={4}>
                                        <IconStarFilled size={14} style={{ color: 'var(--mantine-color-yellow-6)' }} />
                                        <Text size="xs" fw={600}>Votre avis</Text>
                                    </Group>
                                    <Text size="xs" c="dimmed" fs="italic">&quot;{order.review.comment}&quot;</Text>
                                </Card>
                            )}

                            {/* Review button */}
                            <Group justify="flex-end" mt="md">
                                {canReview(order) ? (
                                    <Button
                                        size="xs"
                                        variant="light"
                                        color="yellow"
                                        leftSection={<IconStarFilled size={14} />}
                                        onClick={() => setReviewOrderId(order.id)}
                                    >
                                        Noter cette commande
                                    </Button>
                                ) : order.review ? (
                                    <Tooltip label="Vous avez déjà noté cette commande" withArrow>
                                        <Badge
                                            variant="light"
                                            color="yellow"
                                            leftSection={<IconStarFilled size={12} />}
                                            style={{ cursor: 'default' }}
                                        >
                                            Commande notée
                                        </Badge>
                                    </Tooltip>
                                ) : null}
                            </Group>
                        </Card>
                    ))}
                </Stack>
            )}

            {activeOrder && (
                <ReviewModal
                    opened={!!reviewOrderId}
                    onClose={() => setReviewOrderId(null)}
                    orderId={activeOrder.id}
                    orderItems={activeOrder.items.map(i => ({
                        id: i.id,
                        item: {
                            name: i.item.name,
                            category: i.item.category,
                        }
                    }))}
                />
            )}
        </Container>
    );
}
