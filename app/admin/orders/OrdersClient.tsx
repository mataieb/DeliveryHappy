'use client';

import { Card, Text, Badge, Group, Stack, Button, Divider, Grid, Select, Accordion, Modal, NumberInput } from "@mantine/core";
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
    const [confirmModal, setConfirmModal] = useState({ opened: false, orderId: '', userName: '', returnedCount: 1 });

    const filteredOrders = orders.filter(order => {
        if (filter === 'ALL') return true;
        return order.status === filter;
    });

    // @ts-ignore
    const handleStatusChange = async (orderId: string, newStatus: string, confirmedReturn = false) => {
        setLoading(orderId);
        try {
            // @ts-ignore
            const res = await updateOrderStatusAction(orderId, newStatus, confirmedReturn);
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
                    {(Object.entries(groupedByDate) as any[])
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([date, dateOrders]: [string, any[]]) => (
                            <Accordion.Item key={date} value={date}>
                                <Accordion.Control>
                                    <div>
                                        <Group justify="space-between" mb="xs">
                                            <Text fw={600}>
                                                {dayjs(date).format('dddd DD MMMM YYYY')}
                                            </Text>
                                            <Group gap="xs">
                                                <Badge color="blue">{dateOrders.length} commande(s)</Badge>
                                                <Badge color="green">
                                                    {dateOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)} €
                                                </Badge>
                                            </Group>
                                        </Group>
                                        <Group gap="xs">
                                            <Text size="xs" c="dimmed">
                                                📦 {dateOrders.reduce((sum, o) => sum + o.items.length, 0)} plat(s) total
                                            </Text>
                                            {(() => {
                                                // Calculate stats
                                                const itemCounts: Record<string, number> = {};
                                                const optionCounts: Record<string, number> = {};
                                                let packagingStats = { CARDBOARD: 0, TUPPERWARE: 0, RETURNS: 0 };

                                                dateOrders.forEach(order => {
                                                    // Packaging
                                                    if (order.packaging === 'CARDBOARD') packagingStats.CARDBOARD++;
                                                    if (order.packaging === 'TUPPERWARE') packagingStats.TUPPERWARE++;
                                                    if (order.isReturningContainer) packagingStats.RETURNS += (order.containersReturnedCount || 0);

                                                    order.items.forEach((item: any) => {
                                                        const category = item.item.category;
                                                        itemCounts[category] = (itemCounts[category] || 0) + 1;

                                                        // Legacy options
                                                        if (item.selectedOption) {
                                                            optionCounts[item.selectedOption] = (optionCounts[item.selectedOption] || 0) + 1;
                                                        }

                                                        // New Complex Options
                                                        if (item.selectedOptions && item.item.optionGroups) {
                                                            Object.entries(item.selectedOptions).forEach(([groupId, selection]) => {
                                                                const group = item.item.optionGroups.find((g: any) => g.id === groupId);
                                                                if (group) {
                                                                    // Infer type from group name (robust enough for now)
                                                                    if (group.name.includes("Protéines")) optionCounts['PROTEIN'] = (optionCounts['PROTEIN'] || 0) + 1;
                                                                    if (group.name.includes("Sans Gluten")) optionCounts['GLUTEN_FREE'] = (optionCounts['GLUTEN_FREE'] || 0) + 1;
                                                                    if (group.name.includes("Variantes")) {
                                                                        // We might want to know WHICH variant
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
                                                            {itemCounts.STARTER > 0 && (
                                                                <Badge size="xs" variant="dot" color="orange">
                                                                    {itemCounts.STARTER} entrée(s)
                                                                </Badge>
                                                            )}
                                                            {itemCounts.MAIN > 0 && (
                                                                <Badge size="xs" variant="dot" color="blue">
                                                                    {itemCounts.MAIN} plat(s)
                                                                </Badge>
                                                            )}
                                                            {itemCounts.DESSERT > 0 && (
                                                                <Badge size="xs" variant="dot" color="pink">
                                                                    {itemCounts.DESSERT} dessert(s)
                                                                </Badge>
                                                            )}
                                                            {itemCounts.DRINK > 0 && (
                                                                <Badge size="xs" variant="dot" color="cyan">
                                                                    {itemCounts.DRINK} boisson(s)
                                                                </Badge>
                                                            )}
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

                                                                        {/* Complex Options Display */}
                                                                        {/* @ts-ignore */}
                                                                        {orderItem.selectedOptions && orderItem.item.optionGroups && (
                                                                            <Stack gap={0} ml="md">
                                                                                {/* @ts-ignore */}
                                                                                {Object.entries(orderItem.selectedOptions).map(([groupId, selection]) => {
                                                                                    // @ts-ignore
                                                                                    const group = orderItem.item.optionGroups.find(g => g.id === groupId);
                                                                                    if (!group) return null;

                                                                                    const ids = Array.isArray(selection) ? selection : [selection];
                                                                                    // @ts-ignore
                                                                                    const names = ids.map(id => {
                                                                                        // @ts-ignore
                                                                                        const opt = group.options.find(o => o.id === id);
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

                                                                        <Text size="sm" c="dimmed">- {orderItem.item.price} €</Text>
                                                                    </Group>
                                                                ))}
                                                            </Stack>

                                                            <Divider my="xs" />

                                                            <Text size="sm" fw={500}>Adresse de livraison :</Text>
                                                            <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                                                                {order.deliveryAddress}
                                                            </Text>

                                                            <Divider my="xs" />
                                                            <Group gap="xs">
                                                                <Text size="sm" fw={500}>Emballage :</Text>
                                                                {/* @ts-ignore */}
                                                                {order.packaging === 'TUPPERWARE' ? (
                                                                    <Badge color="blue" variant="filled">Tupperware</Badge>
                                                                ) : (
                                                                    <Badge color="gray" variant="outline">Carton</Badge>
                                                                )}
                                                                {/* @ts-ignore */}
                                                                {order.isReturningContainer && (
                                                                    <Badge color="orange" variant="light">Retourne un Tupperware</Badge>
                                                                )}
                                                            </Group>

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
                                                                        onClick={() => {
                                                                            if (status === 'DELIVERED' && order.status === 'IN_DELIVERY' && (order.isReturningContainer || (order.containersReturnedCount || 0) > 0)) {
                                                                                setConfirmModal({
                                                                                    opened: true,
                                                                                    orderId: order.id,
                                                                                    userName: order.user.name || order.user.email,
                                                                                    // @ts-ignore
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
                        ))}
                </Accordion>
            )}

            <Modal
                opened={confirmModal.opened}
                onClose={() => setConfirmModal({ ...confirmModal, opened: false })}
                title="Confirmation de retour Tupperware"
                centered
            >
                <Text mb="md">
                    L'utilisateur <b>{confirmModal.userName}</b> a prévu de rendre <b>{confirmModal.returnedCount}</b> Tupperware(s).
                </Text>

                <NumberInput
                    label="Nombre de Tupperwares récupérés :"
                    min={0}
                    value={confirmModal.returnedCount}
                    onChange={(val) => setConfirmModal({ ...confirmModal, returnedCount: Number(val) })}
                    mb="xl"
                />

                <Group justify="flex-end">
                    {/* @ts-ignore */}
                    <Button variant="default" onClick={() => handleStatusChange(confirmModal.orderId, 'DELIVERED', 0).then(() => setConfirmModal({ ...confirmModal, opened: false }))}>
                        Annuler / Pas rendu (0)
                    </Button>
                    {/* @ts-ignore */}
                    <Button color="green" onClick={() => handleStatusChange(confirmModal.orderId, 'DELIVERED', confirmModal.returnedCount).then(() => setConfirmModal({ ...confirmModal, opened: false }))}>
                        Confirmer (-{confirmModal.returnedCount})
                    </Button>
                </Group>
            </Modal>
        </Stack>
    );
}
