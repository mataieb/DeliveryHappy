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
    Modal,
    Tabs,
} from '@mantine/core';
import { IconStarFilled, IconStar, IconX, IconHistory, IconLoader } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useState } from 'react';
import ReviewModal from './ReviewModal';
import { cancelOrderAction } from './actions';
import { notifications } from '@mantine/notifications';
import { isOrderingOpen } from '@/lib/ordering';

dayjs.locale('fr');

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'En attente de validation',
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

// Étapes du workflow de livraison
const DELIVERY_STEPS = ['PENDING', 'IN_KITCHEN', 'IN_DELIVERY', 'DELIVERED'];

function getStepperActive(status: string): number {
    const idx = DELIVERY_STEPS.indexOf(status);
    // active=n → étapes 0..n-1 cochées, étape n = courante
    return idx === -1 ? 0 : idx;
}

const ACTIVE_STATUSES = ['PENDING', 'IN_KITCHEN', 'IN_DELIVERY', 'DELIVERED'];

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

function DateBadge({ date }: { date: string | Date }) {
    const menuDay = dayjs(date).startOf('day');
    const today = dayjs().startOf('day');
    const diff = menuDay.diff(today, 'day');
    if (diff === 0) return <Badge color="green" size="sm">Aujourd'hui</Badge>;
    if (diff === 1) return <Badge color="blue" size="sm">Demain</Badge>;
    if (diff > 1) return <Badge color="gray" size="sm">Dans {diff} jours</Badge>;
    return null;
}

function OrderCard({
    order,
    isActive,
    onReview,
    onCancel,
}: {
    order: OrderForDisplay;
    isActive: boolean;
    onReview: (id: string) => void;
    onCancel: (id: string) => void;
}) {
    const canReview = ['DELIVERED', 'PAID'].includes(order.status) && !order.review;
    // Annulation possible uniquement si PENDING et avant 21h la veille (J-1)
    const canCancel = order.status === 'PENDING' && isOrderingOpen(new Date(order.menu.date));

    return (
        <Card withBorder shadow="sm" radius="md">
            <Group justify="space-between" mb="xs" wrap="wrap">
                <Group wrap="wrap" gap="xs">
                    <Text fw={700} style={{ textTransform: 'capitalize' }}>
                        {dayjs(order.menu.date).format('dddd D MMMM')}
                    </Text>
                    {isActive && <DateBadge date={order.menu.date} />}
                    {!isActive && (
                        <Badge color={STATUS_COLORS[order.status] ?? 'gray'} variant="light">
                            {STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                    )}
                </Group>
                <Text fw={700} c="blue">{order.total.toFixed(2)} €</Text>
            </Group>

            {/* Timeline pour les commandes actives (hors annulé) */}
            {isActive && order.status !== 'CANCELLED' && (() => {
                const stepLabels = ['Reçue', 'En cuisine', 'En livraison', 'Livrée'];
                const activeIdx = getStepperActive(order.status);
                return (
                    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
                        {DELIVERY_STEPS.map((step, i) => {
                            const done = i < activeIdx;
                            const active = i === activeIdx;
                            return (
                                <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < DELIVERY_STEPS.length - 1 ? 1 : 'none' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                        <div style={{
                                            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                            backgroundColor: done || active ? '#4c6ef5' : 'var(--mantine-color-gray-2)',
                                            color: done || active ? 'white' : 'var(--mantine-color-gray-5)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 10, fontWeight: 700,
                                        }}>
                                            {done ? '✓' : i + 1}
                                        </div>
                                        <Text fw={active ? 600 : 400} c={active ? 'indigo' : 'dimmed'} style={{ whiteSpace: 'nowrap', fontSize: 10 }}>
                                            {stepLabels[i]}
                                        </Text>
                                    </div>
                                    {i < DELIVERY_STEPS.length - 1 && (
                                        <div style={{
                                            flex: 1, height: 2, marginBottom: 18, marginLeft: 4, marginRight: 4,
                                            backgroundColor: done ? '#4c6ef5' : 'var(--mantine-color-gray-2)',
                                        }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })()}

            <Group gap="xs" mb="md" wrap="wrap">
                <Text size="sm" c="dimmed">📍 {order.deliveryAddress}</Text>
                <Badge variant="outline" color="gray" size="sm">
                    {order.packaging === 'TUPPERWARE' ? '🍱 Tupperware' : '📦 Carton'}
                </Badge>
                {order.isReturningContainer && (
                    <Badge variant="outline" color="orange" size="sm">
                        ↩️ Retour ({order.containersReturnedCount})
                    </Badge>
                )}
            </Group>

            <Stack gap="xs">
                {order.items.map(orderItem => {
                    const itemReviewRating = order.review?.itemRatings.find(r => r.orderItemId === orderItem.id);
                    return (
                        <Group key={orderItem.id} justify="space-between" align="flex-start">
                            <div>
                                <Text size="sm" fw={500}>{orderItem.item.name}</Text>
                                <Group gap={4} mt={4}>
                                    {orderItem.selectedOption && (
                                        <Badge size="xs" variant="light" color="gray">{orderItem.selectedOption}</Badge>
                                    )}
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
                                                    return <Badge key={opt.id} size="xs" variant="light" color={color}>{opt.name}</Badge>;
                                                });
                                            })}
                                        </>
                                    )}
                                </Group>
                            </div>
                            <Group gap="xs" align="center">
                                {itemReviewRating && <StarDisplay rating={itemReviewRating.rating} />}
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

            {order.review?.comment && (
                <Card bg="yellow.0" mt="md" p="xs" radius="sm" withBorder>
                    <Group gap="xs" mb={4}>
                        <IconStarFilled size={14} style={{ color: 'var(--mantine-color-yellow-6)' }} />
                        <Text size="xs" fw={600}>Votre avis</Text>
                    </Group>
                    <Text size="xs" c="dimmed" fs="italic">&quot;{order.review.comment}&quot;</Text>
                </Card>
            )}

            <Group justify="space-between" mt="md">
                {canCancel ? (
                    <Button size="xs" variant="subtle" color="red" leftSection={<IconX size={14} />} onClick={() => onCancel(order.id)}>
                        Annuler la commande
                    </Button>
                ) : (
                    <span />
                )}

                {canReview ? (
                    <Button size="xs" variant="light" color="yellow" leftSection={<IconStarFilled size={14} />} onClick={() => onReview(order.id)}>
                        Noter cette commande
                    </Button>
                ) : order.review ? (
                    <Tooltip label="Vous avez déjà noté cette commande" withArrow>
                        <Badge variant="light" color="yellow" leftSection={<IconStarFilled size={12} />} style={{ cursor: 'default' }}>
                            Commande notée
                        </Badge>
                    </Tooltip>
                ) : null}
            </Group>
        </Card>
    );
}

export default function OrdersClient({ orders }: { orders: OrderForDisplay[] }) {
    const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
    const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

    const activeOrder = reviewOrderId ? orders.find(o => o.id === reviewOrderId) : null;
    const orderToCancel = cancelOrderId ? orders.find(o => o.id === cancelOrderId) : null;

    const activeOrders = orders
        .filter(o => ACTIVE_STATUSES.includes(o.status))
        .sort((a, b) => dayjs(a.menu.date).unix() - dayjs(b.menu.date).unix());

    const pastOrders = orders
        .filter(o => !ACTIVE_STATUSES.includes(o.status))
        .sort((a, b) => dayjs(b.menu.date).unix() - dayjs(a.menu.date).unix());

    const handleConfirmCancel = async () => {
        if (!cancelOrderId) return;
        setCancelling(true);
        try {
            const res = await cancelOrderAction(cancelOrderId);
            if (res.success) {
                notifications.show({ title: 'Commande annulée', message: 'Votre commande a bien été annulée.', color: 'green' });
            } else {
                notifications.show({ title: 'Erreur', message: res.error ?? 'Une erreur est survenue.', color: 'red' });
            }
        } finally {
            setCancelling(false);
            setCancelOrderId(null);
        }
    };

    return (
        <Container size="lg" pt="xs" pb="xl">
            <Title order={3} mb="md">Mes Commandes</Title>

            {orders.length === 0 ? (
                <Text c="dimmed">Vous n&apos;avez pas encore passé de commande.</Text>
            ) : (
                <Stack gap="lg">
                    {/* Onglets */}
                    <Tabs defaultValue={activeOrders.length > 0 ? 'active' : 'history'}>
                        <Tabs.List mb="md">
                            <Tabs.Tab
                                value="active"
                                leftSection={<IconLoader size={16} />}
                                rightSection={activeOrders.length > 0 ? (
                                    <Badge size="xs" color="orange" variant="filled" circle>
                                        {activeOrders.length}
                                    </Badge>
                                ) : undefined}
                            >
                                En cours
                            </Tabs.Tab>
                            <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
                                Historique
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="active">
                            {activeOrders.length === 0 ? (
                                <Text c="dimmed" fs="italic">Aucune commande en cours.</Text>
                            ) : (
                                <Stack gap="sm">
                                    {activeOrders.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            isActive
                                            onReview={setReviewOrderId}
                                            onCancel={setCancelOrderId}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Tabs.Panel>

                        <Tabs.Panel value="history">
                            {pastOrders.length === 0 ? (
                                <Text c="dimmed" fs="italic">Aucune commande dans l'historique.</Text>
                            ) : (
                                <Stack gap="sm">
                                    {pastOrders.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            isActive={false}
                                            onReview={setReviewOrderId}
                                            onCancel={setCancelOrderId}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Tabs.Panel>
                    </Tabs>
                </Stack>
            )}

            {activeOrder && (
                <ReviewModal
                    opened={!!reviewOrderId}
                    onClose={() => setReviewOrderId(null)}
                    orderId={activeOrder.id}
                    orderItems={activeOrder.items.map(i => ({
                        id: i.id,
                        item: { name: i.item.name, category: i.item.category },
                    }))}
                />
            )}

            <Modal
                opened={!!cancelOrderId}
                onClose={() => setCancelOrderId(null)}
                title="Annuler la commande ?"
                centered
                size="sm"
            >
                <Stack gap="md">
                    <Text size="sm">
                        Êtes-vous sûr de vouloir annuler votre commande du{' '}
                        <strong>
                            {orderToCancel ? dayjs(orderToCancel.menu.date).format('dddd D MMMM') : ''}
                        </strong>{' '}?
                        <br /><br />
                        Cette action est <strong>irréversible</strong>.
                    </Text>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="subtle" color="gray" onClick={() => setCancelOrderId(null)} disabled={cancelling}>
                            Garder ma commande
                        </Button>
                        <Button color="red" leftSection={<IconX size={14} />} loading={cancelling} onClick={handleConfirmCancel}>
                            Oui, annuler
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}
