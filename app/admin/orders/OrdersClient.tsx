'use client';

import {
    Card, Text, Badge, Group, Stack, Button, Divider, Grid, Select,
    Accordion, Modal, NumberInput, Table, ScrollArea, Tooltip, ThemeIcon, Box, Progress
} from "@mantine/core";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import 'dayjs/locale/fr';
import { updateOrderStatusAction } from "./actions";
import { setMenuLockedAction } from "../menus/actions";
import { IconStarFilled, IconStar, IconMessageCircle, IconChartBar, IconLock, IconLockOpen, IconPlus, IconEdit } from "@tabler/icons-react";
import { AdminOrderModal } from "./AdminOrderModal";

type Order = any;

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

// ─── Mini star display ─────────────────────────────────────────────────────────
function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
    const full = Math.floor(rating);
    return (
        <Group gap={2} wrap="nowrap">
            {[1, 2, 3, 4, 5].map((s) => (
                s <= full
                    ? <IconStarFilled key={s} size={size} style={{ color: 'var(--mantine-color-yellow-5)' }} />
                    : <IconStar key={s} size={size} style={{ color: 'var(--mantine-color-gray-4)' }} />
            ))}
        </Group>
    );
}

// ─── Rating color helper ──────────────────────────────────────────────────────
function ratingColor(avg: number): string {
    if (avg >= 4.5) return 'green';
    if (avg >= 3.5) return 'teal';
    if (avg >= 2.5) return 'yellow';
    if (avg >= 1.5) return 'orange';
    return 'red';
}

// ─── Compute per-item average ratings across all orders for a given date ──────
function computeItemAverages(dateOrders: Order[]): { itemId: string; itemName: string; avg: number; count: number }[] {
    const ratingMap: Record<string, { name: string; total: number; count: number }> = {};

    for (const order of dateOrders) {
        if (!order.review) continue;
        for (const orderItem of order.items) {
            const rating = order.review.itemRatings.find((r: any) => r.orderItemId === orderItem.id);
            if (!rating) continue;
            const key = orderItem.item.id;
            if (!ratingMap[key]) ratingMap[key] = { name: orderItem.item.name, total: 0, count: 0 };
            ratingMap[key].total += rating.rating;
            ratingMap[key].count += 1;
        }
    }

    return Object.entries(ratingMap).map(([itemId, data]) => ({
        itemId,
        itemName: data.name,
        avg: data.total / data.count,
        count: data.count,
    }));
}

// ─── Reviews detail modal ─────────────────────────────────────────────────────
function ReviewsDetailModal({
    opened,
    onClose,
    dateOrders,
    dateLabel,
}: {
    opened: boolean;
    onClose: () => void;
    dateOrders: Order[];
    dateLabel: string;
}) {
    // Only orders with a review
    const reviewedOrders = dateOrders.filter((o: any) => o.review);

    // Collect all unique dish names (columns), preserving order of appearance
    const dishMap: Record<string, string> = {}; // itemId -> name
    for (const order of dateOrders) {
        for (const orderItem of order.items) {
            if (!dishMap[orderItem.item.id]) {
                dishMap[orderItem.item.id] = orderItem.item.name;
            }
        }
    }
    const dishes = Object.entries(dishMap); // [itemId, name]

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <IconMessageCircle size={18} style={{ color: 'var(--mantine-color-blue-6)' }} />
                    <Text fw={700}>Détail des avis – {dateLabel}</Text>
                </Group>
            }
            size="xl"
            radius="md"
        >
            {reviewedOrders.length === 0 ? (
                <Text c="dimmed" fs="italic" ta="center" py="xl">Aucun avis pour cette journée.</Text>
            ) : (
                <ScrollArea>
                    <Table striped highlightOnHover withTableBorder withColumnBorders>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ minWidth: 150 }}>Nom / Prénom</Table.Th>
                                {dishes.map(([itemId, name]) => (
                                    <Table.Th key={itemId} style={{ minWidth: 130, textAlign: 'center' }}>
                                        <Text size="xs" fw={600} lineClamp={2}>{name}</Text>
                                    </Table.Th>
                                ))}
                                <Table.Th style={{ minWidth: 200 }}>Commentaire</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {reviewedOrders.map((order: any) => (
                                <Table.Tr key={order.id}>
                                    <Table.Td>
                                        <Text size="sm" fw={500}>{order.user.name || order.user.email}</Text>
                                    </Table.Td>
                                    {dishes.map(([itemId]) => {
                                        // Find the orderItem for this dish in this order
                                        const orderItem = order.items.find((i: any) => i.item.id === itemId);
                                        const itemRating = orderItem
                                            ? order.review.itemRatings.find((r: any) => r.orderItemId === orderItem.id)
                                            : null;

                                        return (
                                            <Table.Td key={itemId} style={{ textAlign: 'center' }}>
                                                {itemRating ? (
                                                    <Stack gap={2} align="center">
                                                        <StarDisplay rating={itemRating.rating} size={12} />
                                                        <Text size="xs" c="dimmed">{itemRating.rating}/5</Text>
                                                    </Stack>
                                                ) : (
                                                    <Text size="xs" c="dimmed">—</Text>
                                                )}
                                            </Table.Td>
                                        );
                                    })}
                                    <Table.Td>
                                        {order.review.comment ? (
                                            <Text size="xs" fs="italic" c="dimmed">
                                                &quot;{order.review.comment}&quot;
                                            </Text>
                                        ) : (
                                            <Text size="xs" c="dimmed">—</Text>
                                        )}
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                        {/* Footer row: averages */}
                        <Table.Tfoot>
                            <Table.Tr style={{ background: 'var(--mantine-color-gray-0)' }}>
                                <Table.Td>
                                    <Text size="xs" fw={700} c="dimmed">Moyenne</Text>
                                </Table.Td>
                                {dishes.map(([itemId, name]) => {
                                    const ratings: number[] = [];
                                    for (const order of reviewedOrders) {
                                        const orderItem = order.items.find((i: any) => i.item.id === itemId);
                                        if (!orderItem) continue;
                                        const r = order.review.itemRatings.find((r: any) => r.orderItemId === orderItem.id);
                                        if (r) ratings.push(r.rating);
                                    }
                                    const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
                                    return (
                                        <Table.Td key={itemId} style={{ textAlign: 'center' }}>
                                            {avg !== null ? (
                                                <Stack gap={2} align="center">
                                                    <Text size="xs" fw={700} c={ratingColor(avg)}>
                                                        {avg.toFixed(1)}/5
                                                    </Text>
                                                    <Text size="xs" c="dimmed">({ratings.length} avis)</Text>
                                                </Stack>
                                            ) : (
                                                <Text size="xs" c="dimmed">—</Text>
                                            )}
                                        </Table.Td>
                                    );
                                })}
                                <Table.Td />
                            </Table.Tr>
                        </Table.Tfoot>
                    </Table>
                </ScrollArea>
            )}
        </Modal>
    );
}

// ─── Reviews summary card (inside each date accordion) ───────────────────────
function ReviewsSummaryCard({
    dateOrders,
    dateLabel,
}: {
    dateOrders: Order[];
    dateLabel: string;
}) {
    const [detailOpened, setDetailOpened] = useState(false);

    const reviewedCount = dateOrders.filter((o: any) => o.review).length;
    const totalCount = dateOrders.length;
    const itemAverages = computeItemAverages(dateOrders);

    if (reviewedCount === 0) return null;

    return (
        <>
            <Card withBorder radius="md" p="md" bg="yellow.0" style={{ borderColor: 'var(--mantine-color-yellow-3)' }}>
                <Group justify="space-between" mb="sm" align="flex-start">
                    <Group gap="xs">
                        <ThemeIcon color="yellow" variant="light" size="sm">
                            <IconStarFilled size={12} />
                        </ThemeIcon>
                        <Text fw={700} size="sm">
                            Récap des avis
                        </Text>
                        <Badge size="xs" color="yellow" variant="light">
                            {reviewedCount}/{totalCount} avis reçus
                        </Badge>
                    </Group>
                    <Button
                        size="xs"
                        variant="light"
                        color="blue"
                        leftSection={<IconChartBar size={14} />}
                        onClick={() => setDetailOpened(true)}
                    >
                        Voir le détail
                    </Button>
                </Group>

                <Stack gap="xs">
                    {itemAverages.map((entry) => (
                        <Box key={entry.itemId}>
                            <Group justify="space-between" mb={4}>
                                <Text size="xs" fw={500}>{entry.itemName}</Text>
                                <Group gap="xs">
                                    <StarDisplay rating={Math.round(entry.avg)} size={12} />
                                    <Text size="xs" fw={700} c={ratingColor(entry.avg)}>
                                        {entry.avg.toFixed(1)}/5
                                    </Text>
                                    <Text size="xs" c="dimmed">({entry.count} avis)</Text>
                                </Group>
                            </Group>
                            <Progress
                                value={(entry.avg / 5) * 100}
                                color={ratingColor(entry.avg)}
                                size="sm"
                                radius="xl"
                            />
                        </Box>
                    ))}
                </Stack>
            </Card>

            <ReviewsDetailModal
                opened={detailOpened}
                onClose={() => setDetailOpened(false)}
                dateOrders={dateOrders}
                dateLabel={dateLabel}
            />
        </>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function OrdersClient({ orders }: { orders: Order[] }) {
    const [filter, setFilter] = useState<string>('ALL');
    const [loading, setLoading] = useState<string | null>(null);
    const [lockLoading, setLockLoading] = useState<string | null>(null); // menuId being locked
    const [confirmModal, setConfirmModal] = useState({ opened: false, orderId: '', userName: '', returnedCount: 1 });
    const [orderModal, setOrderModal] = useState<{ opened: boolean; editOrder?: any }>({ opened: false });

    const filteredOrders = orders.filter(order => {
        if (filter === 'ALL') return true;
        return order.status === filter;
    });

    const handleStatusChange = async (orderId: string, newStatus: string, confirmedReturn = 0) => {
        setLoading(orderId);
        try {
            const res = await updateOrderStatusAction(orderId, newStatus, confirmedReturn);
            if (res.success) {
                notifications.show({ title: 'Succès', message: 'Statut mis à jour', color: 'green' });
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } finally {
            setLoading(null);
        }
    };

    const handleToggleLock = async (menuId: string, currentlyLocked: boolean) => {
        setLockLoading(menuId);
        try {
            const res = await setMenuLockedAction(menuId, !currentlyLocked);
            if (res.success) {
                notifications.show({
                    title: !currentlyLocked ? 'Commandes bloquées' : 'Commandes rouvertes',
                    message: !currentlyLocked
                        ? 'Les nouvelles commandes sont désormais bloquées pour ce jour.'
                        : 'Les commandes sont à nouveau ouvertes pour ce jour.',
                    color: !currentlyLocked ? 'orange' : 'green',
                });
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } finally {
            setLockLoading(null);
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
            <Group justify="space-between">
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
                        style={{ minWidth: 200 }}
                    />
                    <Text size="sm" c="dimmed" mt="xl">
                        {filteredOrders.length} commande(s)
                    </Text>
                </Group>
                <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setOrderModal({ opened: true })}
                    mt="xl"
                >
                    Nouvelle commande
                </Button>
            </Group>

            {Object.keys(groupedByDate).length === 0 ? (
                <Text c="dimmed" fs="italic">Aucune commande trouvée.</Text>
            ) : (
                <Accordion variant="separated">
                    {(Object.entries(groupedByDate) as any[])
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([date, dateOrders]: [string, any[]]) => {
                            const dateLabel = dayjs(date).locale('fr').format('dddd DD MMMM YYYY');
                            const reviewedCount = dateOrders.filter((o: any) => o.review).length;
                            const menuId: string = dateOrders[0]?.menu?.id;
                            const isMenuLocked: boolean = !!(dateOrders[0]?.menu as any)?.locked;

                            return (
                                <Accordion.Item key={date} value={date}>
                                    {/* Lock button row — above accordion control to avoid toggle conflict */}
                                    <Group justify="space-between" px="md" pt="xs" pb={0}>
                                        <Text size="xs" c="dimmed" fw={500}>
                                            {dateLabel}
                                        </Text>
                                        <Tooltip
                                            label={isMenuLocked ? 'Rouvrir les commandes' : 'Bloquer les nouvelles commandes'}
                                            withArrow
                                        >
                                            <Button
                                                size="xs"
                                                variant="light"
                                                color={isMenuLocked ? 'green' : 'orange'}
                                                leftSection={isMenuLocked ? <IconLockOpen size={14} /> : <IconLock size={14} />}
                                                loading={lockLoading === menuId}
                                                onClick={() => handleToggleLock(menuId, isMenuLocked)}
                                            >
                                                {isMenuLocked ? 'Rouvrir' : 'Bloquer'}
                                            </Button>
                                        </Tooltip>
                                    </Group>

                                    <Accordion.Control>
                                        <div>
                                            <Group justify="space-between" mb="xs">
                                                <Group gap="xs">
                                                    {isMenuLocked && (
                                                        <Badge color="red" variant="filled" size="sm" leftSection={<IconLock size={10} />}>
                                                            Bloqué
                                                        </Badge>
                                                    )}
                                                    <Text fw={600}>{dateLabel}</Text>
                                                </Group>
                                                <Group gap="xs">
                                                    <Badge color="blue">{dateOrders.length} commande(s)</Badge>
                                                    <Badge color="green">
                                                        {dateOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)} €
                                                    </Badge>
                                                    {reviewedCount > 0 && (
                                                        <Tooltip label={`${reviewedCount} avis reçus`} withArrow>
                                                            <Badge color="yellow" variant="light" leftSection={<IconStarFilled size={10} />}>
                                                                {reviewedCount} avis
                                                            </Badge>
                                                        </Tooltip>
                                                    )}
                                                </Group>
                                            </Group>
                                            <Group gap="xs">
                                                <Text size="xs" c="dimmed">
                                                    📦 {dateOrders.reduce((sum, o) => sum + o.items.length, 0)} plat(s) total
                                                </Text>
                                                {(() => {
                                                    const itemCounts: Record<string, number> = {};
                                                    const optionCounts: Record<string, number> = {};
                                                    const packagingStats = { CARDBOARD: 0, TUPPERWARE: 0, RETURNS: 0 };

                                                    dateOrders.forEach(order => {
                                                        if (order.packaging === 'CARDBOARD') packagingStats.CARDBOARD++;
                                                        if (order.packaging === 'TUPPERWARE') packagingStats.TUPPERWARE++;
                                                        if (order.isReturningContainer) packagingStats.RETURNS += (order.containersReturnedCount || 0);

                                                        order.items.forEach((item: any) => {
                                                            const category = item.item.category;
                                                            itemCounts[category] = (itemCounts[category] || 0) + 1;

                                                            if (item.selectedOption) {
                                                                optionCounts[item.selectedOption] = (optionCounts[item.selectedOption] || 0) + 1;
                                                            }

                                                            if (item.selectedOptions && item.item.optionGroups) {
                                                                Object.entries(item.selectedOptions).forEach(([groupId, selection]) => {
                                                                    const group = item.item.optionGroups.find((g: any) => g.id === groupId);
                                                                    if (group) {
                                                                        if (group.name.includes("Protéines")) optionCounts['PROTEIN'] = (optionCounts['PROTEIN'] || 0) + 1;
                                                                        if (group.name.includes("Sans Gluten")) optionCounts['GLUTEN_FREE'] = (optionCounts['GLUTEN_FREE'] || 0) + 1;
                                                                        if (group.name.includes("Variantes")) {
                                                                            const ids = Array.isArray(selection) ? selection : [selection];
                                                                            ids.forEach((id: string) => {
                                                                                const opt = group.options.find((o: any) => o.id === id);
                                                                                if (opt) {
                                                                                    if (opt.name.includes("Végé")) optionCounts['VEGETARIAN'] = (optionCounts['VEGETARIAN'] || 0) + 1;
                                                                                    if (opt.name.includes("Végan")) optionCounts['VEGAN'] = (optionCounts['VEGAN'] || 0) + 1;
                                                                                    if (opt.name.includes("Halal")) optionCounts['HALAL'] = (optionCounts['HALAL'] || 0) + 1;
                                                                                    if (opt.name.includes("Sans Gluten")) optionCounts['GLUTEN_FREE'] = (optionCounts['GLUTEN_FREE'] || 0) + 1;
                                                                                }
                                                                            });
                                                                        }
                                                                        if (group.name.includes("épice")) optionCounts['SPICY'] = (optionCounts['SPICY'] || 0) + 1;
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    });

                                                    return (
                                                        <Stack gap={4}>
                                                            <Group gap="xs">
                                                                {itemCounts.STARTER > 0 && <Badge size="xs" variant="dot" color="orange">{itemCounts.STARTER} entrée(s)</Badge>}
                                                                {itemCounts.MAIN > 0 && <Badge size="xs" variant="dot" color="blue">{itemCounts.MAIN} plat(s)</Badge>}
                                                                {itemCounts.DESSERT > 0 && <Badge size="xs" variant="dot" color="pink">{itemCounts.DESSERT} dessert(s)</Badge>}
                                                                {itemCounts.DRINK > 0 && <Badge size="xs" variant="dot" color="cyan">{itemCounts.DRINK} boisson(s)</Badge>}
                                                            </Group>
                                                            <Group gap="xs">
                                                                <Text size="xs" c="dimmed">📦 {packagingStats.CARDBOARD} Cartons</Text>
                                                                <Text size="xs" c="dimmed">🍱 {packagingStats.TUPPERWARE} Tupperwares</Text>
                                                                {packagingStats.RETURNS > 0 && <Text size="xs" c="orange">↩️ {packagingStats.RETURNS} retours</Text>}
                                                            </Group>
                                                            {Object.keys(optionCounts).length > 0 && (
                                                                <Group gap="xs">
                                                                    <Text size="xs" c="dimmed">🌿 Options plat :</Text>
                                                                    {optionCounts.VEGETARIAN > 0 && <Badge size="xs" variant="light" color="green">{optionCounts.VEGETARIAN} Végétarien</Badge>}
                                                                    {optionCounts.VEGAN > 0 && <Badge size="xs" variant="light" color="teal">{optionCounts.VEGAN} Végan</Badge>}
                                                                    {optionCounts.HALAL > 0 && <Badge size="xs" variant="light" color="grape">{optionCounts.HALAL} Halal</Badge>}
                                                                    {optionCounts.GLUTEN_FREE > 0 && <Badge size="xs" variant="light" color="yellow">{optionCounts.GLUTEN_FREE} Sans Gluten</Badge>}
                                                                    {optionCounts.PROTEIN > 0 && <Badge size="xs" variant="light" color="blue">{optionCounts.PROTEIN} Protéines</Badge>}
                                                                    {optionCounts.SPICY > 0 && <Badge size="xs" variant="light" color="red">{optionCounts.SPICY} Épicé</Badge>}
                                                                </Group>
                                                            )}
                                                        </Stack>
                                                    );
                                                })()}
                                            </Group>
                                        </div>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="md">
                                            {/* ── Reviews Summary Card ── */}
                                            <ReviewsSummaryCard dateOrders={dateOrders} dateLabel={dateLabel} />

                                            {/* ── Individual Order Cards ── */}
                                            {dateOrders.map(order => (
                                                <Card key={order.id} withBorder shadow="sm" radius="md" p="md">
                                                    <Grid>
                                                        <Grid.Col span={{ base: 12, md: 8 }}>
                                                            <Stack gap="xs">
                                                                <Group justify="space-between">
                                                                  <Group>
                                                                    <Text fw={600} size="lg">
                                                                        {order.user.name || order.user.email}
                                                                    </Text>
                                                                    <Badge color={STATUS_COLORS[order.status]}>
                                                                        {STATUS_LABELS[order.status]}
                                                                    </Badge>
                                                                    {order.review && (
                                                                        <Tooltip label="Cet utilisateur a laissé un avis" withArrow>
                                                                            <Badge color="yellow" variant="light" size="sm" leftSection={<IconStarFilled size={10} />}>
                                                                                Noté
                                                                            </Badge>
                                                                        </Tooltip>
                                                                    )}
                                                                  </Group>
                                                                  <Button
                                                                      size="xs"
                                                                      variant="light"
                                                                      color="blue"
                                                                      leftSection={<IconEdit size={14} />}
                                                                      onClick={() => setOrderModal({
                                                                          opened: true,
                                                                          editOrder: {
                                                                              id: order.id,
                                                                              userId: order.userId,
                                                                              menuId: order.menu.id,
                                                                              deliveryAddress: order.deliveryAddress,
                                                                              packaging: order.packaging,
                                                                              notes: order.notes,
                                                                              items: order.items.map((oi: any) => ({
                                                                                  itemId: oi.item.id,
                                                                                  selectedOptions: oi.selectedOptions
                                                                              }))
                                                                          }
                                                                      })}
                                                                  >
                                                                      Modifier
                                                                  </Button>
                                                                </Group>

                                                                <Text size="sm" c="dimmed">
                                                                    Commandé le {dayjs(order.createdAt).format('DD/MM/YYYY à HH:mm')}
                                                                </Text>

                                                                <Divider my="xs" />

                                                                <Text size="sm" fw={500}>Plats commandés :</Text>
                                                                <Stack gap={4}>
                                                                    {order.items.map((orderItem: any) => {
                                                                        const itemRating = order.review?.itemRatings.find(
                                                                            (r: any) => r.orderItemId === orderItem.id
                                                                        );
                                                                        return (
                                                                            <Group key={orderItem.id} gap="xs" justify="space-between">
                                                                                <Group gap="xs">
                                                                                    <Text size="sm">• {orderItem.item.name}</Text>
                                                                                    {orderItem.selectedOption && (
                                                                                        <Text size="xs" c="dimmed" fs="italic">
                                                                                            ({DIETARY_LABELS[orderItem.selectedOption] || orderItem.selectedOption})
                                                                                        </Text>
                                                                                    )}
                                                                                    {orderItem.selectedOptions && orderItem.item.optionGroups && (
                                                                                        <Stack gap={0} ml="md">
                                                                                            {Object.entries(orderItem.selectedOptions).map(([groupId, selection]) => {
                                                                                                const group = orderItem.item.optionGroups.find((g: any) => g.id === groupId);
                                                                                                if (!group) return null;
                                                                                                const ids = Array.isArray(selection) ? selection : [selection];
                                                                                                const names = ids.map((id: any) => {
                                                                                                    const opt = group.options.find((o: any) => o.id === id);
                                                                                                    return opt ? opt.name : null;
                                                                                                }).filter(Boolean).join(', ');
                                                                                                if (!names) return null;
                                                                                                return (
                                                                                                    <Text key={groupId} size="xs" c="dimmed">
                                                                                                        + {group.name}: {names}
                                                                                                    </Text>
                                                                                                );
                                                                                            })}
                                                                                        </Stack>
                                                                                    )}
                                                                                </Group>
                                                                                <Group gap="xs" wrap="nowrap">
                                                                                    {itemRating && (
                                                                                        <StarDisplay rating={itemRating.rating} size={12} />
                                                                                    )}
                                                                                    <Text size="sm" c="dimmed">- {orderItem.item.price} €</Text>
                                                                                </Group>
                                                                            </Group>
                                                                        );
                                                                    })}
                                                                </Stack>

                                                                {order.review?.comment && (
                                                                    <>
                                                                        <Divider my="xs" />
                                                                        <Group gap="xs">
                                                                            <IconMessageCircle size={14} color="gray" />
                                                                            <Text size="xs" c="dimmed" fs="italic">
                                                                                &quot;{order.review.comment}&quot;
                                                                            </Text>
                                                                        </Group>
                                                                    </>
                                                                )}

                                                                <Divider my="xs" />

                                                                <Text size="sm" fw={500}>Adresse de livraison :</Text>
                                                                <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                                                                    {order.deliveryAddress}
                                                                </Text>

                                                                <Divider my="xs" />
                                                                <Group gap="xs">
                                                                    <Text size="sm" fw={500}>Emballage :</Text>
                                                                    {order.packaging === 'TUPPERWARE' ? (
                                                                        <Badge color="blue" variant="filled">Tupperware</Badge>
                                                                    ) : (
                                                                        <Badge color="gray" variant="outline">Carton</Badge>
                                                                    )}
                                                                    {order.isReturningContainer && (
                                                                        <Badge color="orange" variant="light">Retourne un Tupperware</Badge>
                                                                    )}
                                                                </Group>

                                                                {order.notes && (
                                                                    <>
                                                                        <Divider my="xs" />
                                                                        <Text size="sm" fw={500}>Notes :</Text>
                                                                        <Text size="sm" fs="italic">{order.notes}</Text>
                                                                    </>
                                                                )}

                                                                <Divider my="xs" />
                                                                <Text size="lg" fw={700} c="blue">
                                                                    Total : {order.total.toFixed(2)} €
                                                                </Text>
                                                            </Stack>
                                                        </Grid.Col>

                                                        <Grid.Col span={{ base: 12, md: 4 }}>
                                                            <Stack>
                                                                <Text size="sm" fw={500}>Changer le statut :</Text>
                                                                <Stack gap="xs">
                                                                    {['PENDING', 'IN_KITCHEN', 'IN_DELIVERY', 'DELIVERED', 'PAID', 'CANCELLED'].map(status => (
                                                                        <Button
                                                                            key={status}
                                                                            variant={order.status === status ? 'filled' : 'light'}
                                                                            color={STATUS_COLORS[status]}
                                                                            size="xs"
                                                                            onClick={() => {
                                                                                if (status === 'DELIVERED' && order.status === 'IN_DELIVERY' && (order.isReturningContainer || (order.containersReturnedCount || 0) > 0)) {
                                                                                    setConfirmModal({
                                                                                        opened: true,
                                                                                        orderId: order.id,
                                                                                        userName: order.user.name || order.user.email,
                                                                                        returnedCount: order.containersReturnedCount || 1
                                                                                    });
                                                                                } else {
                                                                                    handleStatusChange(order.id, status);
                                                                                }
                                                                            }}
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
                            );
                        })}
                </Accordion>
            )}

            {/* Admin create/edit order modal */}
            <AdminOrderModal
                opened={orderModal.opened}
                onClose={() => setOrderModal({ opened: false })}
                editOrder={orderModal.editOrder}
            />

            {/* Tupperware return confirm modal */}
            <Modal
                opened={confirmModal.opened}
                onClose={() => setConfirmModal({ ...confirmModal, opened: false })}
                title="Confirmation de retour Tupperware"
                centered
            >
                <Text mb="md">
                    L&apos;utilisateur <b>{confirmModal.userName}</b> a prévu de rendre <b>{confirmModal.returnedCount}</b> Tupperware(s).
                </Text>

                <NumberInput
                    label="Nombre de Tupperwares récupérés :"
                    min={0}
                    value={confirmModal.returnedCount}
                    onChange={(val) => setConfirmModal({ ...confirmModal, returnedCount: Number(val) })}
                    mb="xl"
                />

                <Group justify="flex-end">
                    <Button variant="default" onClick={() => handleStatusChange(confirmModal.orderId, 'DELIVERED', 0).then(() => setConfirmModal({ ...confirmModal, opened: false }))}>
                        Annuler / Pas rendu (0)
                    </Button>
                    <Button color="green" onClick={() => handleStatusChange(confirmModal.orderId, 'DELIVERED', confirmModal.returnedCount).then(() => setConfirmModal({ ...confirmModal, opened: false }))}>
                        Confirmer (-{confirmModal.returnedCount})
                    </Button>
                </Group>
            </Modal>
        </Stack>
    );
}
