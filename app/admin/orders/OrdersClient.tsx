'use client';

import { Card, Text, Badge, Group, Stack, Button, Divider, Grid, Select, Accordion } from "@mantine/core";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { updateOrderStatusAction } from "./actions";

type Order = any; // Type will be inferred from Prisma

const STATUS_LABELS: Record<string, string> = {
    'PENDING': 'Prise en compte',
    'IN_KITCHEN': 'En cuisine',
    'IN_DELIVERY': 'En livraison',
    'DELIVERED': 'Livrée (attente paiement)',
    'PAID': 'Livrée et payée',
    'CANCELLED': 'Annulée'
};

const STATUS_COLORS: Record<string, string> = {
    'PENDING': 'yellow',
    'IN_KITCHEN': 'orange',
    'IN_DELIVERY': 'cyan',
    'DELIVERED': 'teal',
    'PAID': 'green',
    'CANCELLED': 'red'
};

const DIETARY_LABELS: Record<string, string> = {
    'VEGETARIAN': 'Végétarien',
    'VEGAN': 'Végan',
    'HALAL': 'Halal',
    'GLUTEN_FREE': 'Sans Gluten',
    'SPICY': 'Épicé'
};

export function OrdersClient({ orders }: { orders: Order[] }) {
    const [filter, setFilter] = useState<string>('ALL');
    const [loading, setLoading] = useState<string | null>(null);

    const filteredOrders = orders.filter(order => {
        if (filter === 'ALL') return true;
        return order.status === filter;
    });

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        setLoading(orderId);
        try {
            const res = await updateOrderStatusAction(orderId, newStatus);
            if (res.success) {
                notifications.show({
                    title: 'Succès',
                    message: 'Statut mis à jour',
                    color: 'green'
                });
            } else {
                notifications.show({
                    title: 'Erreur',
                    message: res.error,
                    color: 'red'
                });
            }
        } finally {
            setLoading(null);
        }
    };

    const groupedByDate = filteredOrders.reduce((acc, order) => {
        const date = dayjs(order.menu.date).format('YYYY-MM-DD');
        if (!acc[date]) acc[date] = [];
        acc[date].push(order);
        return acc;
    }, {} as Record<string, Order[]>);

    return (
        <Stack>
            <Group>
                <Select
                    label="Filtrer par statut"
                    value={filter}
                    onChange={(val) => setFilter(val || 'ALL')}
                    data={[
                        { value: 'ALL', label: 'Toutes' },
                        { value: 'PENDING', label: 'Prise en compte' },
                        { value: 'IN_KITCHEN', label: 'En cuisine' },
                        { value: 'IN_DELIVERY', label: 'En livraison' },
                        { value: 'DELIVERED', label: 'Livrées (attente paiement)' },
                        { value: 'PAID', label: 'Livrées et payées' },
                        { value: 'CANCELLED', label: 'Annulées' }
                    ]}
                    style={{ width: 200 }}
                />
                <Text size="sm" c="dimmed" mt="xl">
                    {filteredOrders.length} commande(s)
                </Text>
            </Group>

            {Object.keys(groupedByDate).length === 0 ? (
                <Text c="dimmed" fs="italic">Aucune commande trouvée.</Text>
            ) : (
                <Accordion variant="separated">
                    {Object.entries(groupedByDate)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([date, dateOrders]) => (
                            <Accordion.Item key={date} value={date}>
                                <Accordion.Control>
                                    <Group justify="space-between">
                                        <Text fw={600}>
                                            {dayjs(date).format('dddd DD MMMM YYYY')}
                                        </Text>
                                        <Badge color="blue">{dateOrders.length} commande(s)</Badge>
                                    </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    <Stack gap="md">
                                        {dateOrders.map(order => (
                                            <Card key={order.id} withBorder shadow="sm" radius="md" p="md">
                                                <Grid>
                                                    <Grid.Col span={8}>
                                                        <Stack gap="xs">
                                                            <Group>
                                                                <Text fw={600} size="lg">
                                                                    {order.user.name || order.user.email}
                                                                </Text>
                                                                <Badge color={STATUS_COLORS[order.status]}>
                                                                    {STATUS_LABELS[order.status]}
                                                                </Badge>
                                                            </Group>

                                                            <Text size="sm" c="dimmed">
                                                                Commandé le {dayjs(order.createdAt).format('DD/MM/YYYY à HH:mm')}
                                                            </Text>

                                                            <Divider my="xs" />

                                                            <Text size="sm" fw={500}>Plats commandés :</Text>
                                                            <Stack gap={4}>
                                                                {order.items.map((orderItem: any) => (
                                                                    <Group key={orderItem.id} gap="xs">
                                                                        <Text size="sm">• {orderItem.item.name}</Text>
                                                                        {/* @ts-ignore */}
                                                                        {orderItem.selectedOption && (
                                                                            <Text size="xs" c="dimmed" fs="italic">
                                                                                ({DIETARY_LABELS[orderItem.selectedOption] || orderItem.selectedOption})
                                                                            </Text>
                                                                        )}
                                                                        <Text size="sm" c="dimmed">- {orderItem.item.price} €</Text>
                                                                    </Group>
                                                                ))}
                                                            </Stack>

                                                            <Divider my="xs" />

                                                            <Text size="sm" fw={500}>Adresse de livraison :</Text>
                                                            <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                                                                {order.deliveryAddress}
                                                            </Text>

                                                            {/* @ts-ignore */}
                                                            {order.notes && (
                                                                <>
                                                                    <Divider my="xs" />
                                                                    <Text size="sm" fw={500}>Notes :</Text>
                                                                    {/* @ts-ignore */}
                                                                    <Text size="sm" fs="italic">{order.notes}</Text>
                                                                </>
                                                            )}

                                                            <Divider my="xs" />
                                                            <Text size="lg" fw={700} c="blue">
                                                                Total : {order.total.toFixed(2)} €
                                                            </Text>
                                                        </Stack>
                                                    </Grid.Col>

                                                    <Grid.Col span={4}>
                                                        <Stack>
                                                            <Text size="sm" fw={500}>Changer le statut :</Text>
                                                            <Stack gap="xs">
                                                                {['PENDING', 'IN_KITCHEN', 'IN_DELIVERY', 'DELIVERED', 'PAID', 'CANCELLED'].map(status => (
                                                                    <Button
                                                                        key={status}
                                                                        variant={order.status === status ? 'filled' : 'light'}
                                                                        color={STATUS_COLORS[status]}
                                                                        size="xs"
                                                                        onClick={() => handleStatusChange(order.id, status)}
                                                                        loading={loading === order.id}
                                                                        disabled={order.status === status}
                                                                    >
                                                                        {STATUS_LABELS[status]}
                                                                    </Button>
                                                                ))}
                                                            </Stack>
                                                        </Stack>
                                                    </Grid.Col>
                                                </Grid>
                                            </Card>
                                        ))}
                                    </Stack>
                                </Accordion.Panel>
                            </Accordion.Item>
                        ))}
                </Accordion>
            )}
        </Stack>
    );
}
