'use client';

import { useState } from 'react';
import { Select, Button, Card, Stack, Text, Group, Badge, Divider, Alert, Paper } from '@mantine/core';
import { IconRoute, IconMapPin, IconHome, IconTruck, IconCheck, IconChefHat, IconPlayerPlay } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { startDeliveryForDateAction, markOrdersAsKitchenAction } from './actions';

interface MenuOption {
    value: string;
    label: string;
    date: Date;
    orderCount: number;
}

interface Order {
    id: string;
    deliveryAddress: string;
    user: {
        name: string | null;
        email: string;
    };
}

interface Menu {
    id: string;
    date: Date;
    orders: Order[];
}

interface DeliveryRouteClientProps {
    menuOptions: MenuOption[];
    weekMenus: Menu[];
}

// Simple nearest neighbor algorithm for TSP (Traveling Salesman Problem)
function calculateOptimalRoute(addresses: string[], homeAddress: string = "Votre adresse de départ"): string[] {
    if (addresses.length === 0) return [homeAddress];
    if (addresses.length === 1) return [homeAddress, addresses[0], homeAddress];

    // For simplicity, we'll use a greedy nearest neighbor approach
    // In a real app, you'd use Google Maps API or similar for actual distances
    const route: string[] = [homeAddress];
    const remaining = [...addresses];
    let current = homeAddress;

    while (remaining.length > 0) {
        // Find "nearest" address (alphabetically for now, as we don't have real coordinates)
        // In production, you'd calculate actual distances
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        remaining.forEach((addr, index) => {
            // Simple heuristic: string similarity/length difference
            const distance = Math.abs(addr.length - current.length) +
                (addr.toLowerCase() < current.toLowerCase() ? 0 : 1);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        });

        const nearest = remaining[nearestIndex];
        route.push(nearest);
        remaining.splice(nearestIndex, 1);
        current = nearest;
    }

    route.push(homeAddress); // Return home
    return route;
}

export function DeliveryRouteClient({ menuOptions, weekMenus }: DeliveryRouteClientProps) {
    // Find today's menu or default to first menu
    const todayMenu = weekMenus.find(m => dayjs(m.date).isSame(dayjs(), 'day'));
    const defaultMenuId = todayMenu?.id || (menuOptions.length > 0 ? menuOptions[0].value : null);

    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(defaultMenuId);
    const [optimizedRoute, setOptimizedRoute] = useState<string[] | null>(null);
    const [loading, setLoading] = useState(false);

    const selectedMenu = weekMenus.find(m => m.id === selectedMenuId);

    const handleCalculateRoute = () => {
        if (!selectedMenu) return;

        const addresses = selectedMenu.orders.map(order => order.deliveryAddress);
        const route = calculateOptimalRoute(addresses);
        setOptimizedRoute(route);
    };

    const handleStartDelivery = async () => {
        if (!selectedMenuId) return;

        setLoading(true);
        try {
            const result = await startDeliveryForDateAction(selectedMenuId);
            if (result.success) {
                notifications.show({
                    title: 'Succès',
                    message: result.message,
                    color: 'green'
                });
            } else {
                notifications.show({
                    title: 'Erreur',
                    message: result.error,
                    color: 'red'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsKitchen = async () => {
        if (!selectedMenuId) return;

        setLoading(true);
        try {
            const result = await markOrdersAsKitchenAction(selectedMenuId);
            if (result.success) {
                notifications.show({
                    title: 'Succès',
                    message: result.message,
                    color: 'green'
                });
            } else {
                notifications.show({
                    title: 'Erreur',
                    message: result.error,
                    color: 'red'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack gap="lg">
            <Card withBorder shadow="sm" radius="md" p="lg">
                <Stack gap="md">
                    <Text fw={600} size="lg">Sélectionner un jour de livraison</Text>

                    <Select
                        label="Menu du jour"
                        placeholder="Choisir un menu"
                        data={menuOptions}
                        value={selectedMenuId}
                        onChange={setSelectedMenuId}
                        size="md"
                    />

                    {selectedMenu && (
                        <>
                            <Divider />
                            <Group justify="space-between">
                                <div>
                                    <Text size="sm" c="dimmed">Date de livraison</Text>
                                    <Text fw={600}>{dayjs(selectedMenu.date).format('dddd DD MMMM YYYY')}</Text>
                                </div>
                                <Badge size="lg" color="blue">
                                    {selectedMenu.orders.length} livraison(s)
                                </Badge>
                            </Group>

                            <Divider label="Actions rapides" labelPosition="center" />

                            <Group grow>
                                <Button
                                    leftSection={<IconChefHat size={18} />}
                                    onClick={handleMarkAsKitchen}
                                    size="sm"
                                    variant="light"
                                    color="orange"
                                    loading={loading}
                                    disabled={selectedMenu.orders.length === 0}
                                >
                                    Passer en cuisine
                                </Button>
                                <Button
                                    leftSection={<IconPlayerPlay size={18} />}
                                    onClick={handleStartDelivery}
                                    size="sm"
                                    variant="gradient"
                                    gradient={{ from: 'cyan', to: 'blue' }}
                                    loading={loading}
                                    disabled={selectedMenu.orders.length === 0}
                                >
                                    Démarrer les livraisons
                                </Button>
                            </Group>

                            <Divider />

                            <Button
                                leftSection={<IconRoute size={18} />}
                                onClick={handleCalculateRoute}
                                size="md"
                                fullWidth
                                disabled={selectedMenu.orders.length === 0}
                            >
                                Calculer l'itinéraire optimal
                            </Button>
                        </>
                    )}
                </Stack>
            </Card>

            {selectedMenu && selectedMenu.orders.length === 0 && (
                <Alert color="gray" title="Aucune commande">
                    Il n'y a pas encore de commande pour ce jour.
                </Alert>
            )}

            {selectedMenu && selectedMenu.orders.length > 0 && !optimizedRoute && (
                <Card withBorder shadow="sm" radius="md" p="lg">
                    <Text fw={600} size="lg" mb="md">Adresses de livraison</Text>
                    <Stack gap="xs">
                        {selectedMenu.orders.map((order, index) => (
                            <Paper key={order.id} p="sm" withBorder>
                                <Group>
                                    <IconMapPin size={16} color="gray" />
                                    <div style={{ flex: 1 }}>
                                        <Text size="sm" fw={500}>{order.user.name || order.user.email}</Text>
                                        <Text size="xs" c="dimmed">{order.deliveryAddress}</Text>
                                    </div>
                                </Group>
                            </Paper>
                        ))}
                    </Stack>
                </Card>
            )}

            {optimizedRoute && (
                <Card withBorder shadow="sm" radius="md" p="lg" style={{ backgroundColor: '#f0f9ff' }}>
                    <Group mb="md">
                        <IconTruck size={24} color="#1971c2" />
                        <Text fw={700} size="xl" c="blue">Itinéraire Optimisé</Text>
                    </Group>

                    <Stack gap="md">
                        {optimizedRoute.map((address, index) => {
                            const isStart = index === 0;
                            const isEnd = index === optimizedRoute.length - 1;
                            const isHome = isStart || isEnd;

                            return (
                                <div key={index}>
                                    <Paper p="md" withBorder style={{
                                        backgroundColor: isHome ? '#e7f5ff' : 'white',
                                        borderColor: isHome ? '#1971c2' : undefined,
                                        borderWidth: isHome ? 2 : 1
                                    }}>
                                        <Group>
                                            <Badge
                                                size="lg"
                                                color={isHome ? 'blue' : 'gray'}
                                                variant={isHome ? 'filled' : 'light'}
                                            >
                                                {isStart ? 'DÉPART' : isEnd ? 'RETOUR' : `Arrêt ${index}`}
                                            </Badge>
                                            <div style={{ flex: 1 }}>
                                                {isHome ? (
                                                    <Group gap="xs">
                                                        <IconHome size={18} color="#1971c2" />
                                                        <Text fw={600} c="blue">{address}</Text>
                                                    </Group>
                                                ) : (
                                                    <>
                                                        <Group gap="xs">
                                                            <IconMapPin size={16} />
                                                            <Text fw={500}>{address}</Text>
                                                        </Group>
                                                        {selectedMenu && (
                                                            <Text size="xs" c="dimmed" mt={4}>
                                                                {selectedMenu.orders.find(o => o.deliveryAddress === address)?.user.name ||
                                                                    selectedMenu.orders.find(o => o.deliveryAddress === address)?.user.email}
                                                            </Text>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            {!isEnd && (
                                                <Text c="dimmed" size="xl">↓</Text>
                                            )}
                                        </Group>
                                    </Paper>
                                    {!isEnd && <div style={{ height: 8 }} />}
                                </div>
                            );
                        })}
                    </Stack>

                    <Divider my="lg" />

                    <Alert icon={<IconCheck size={16} />} color="green" title="Itinéraire calculé">
                        Total: {optimizedRoute.length - 2} livraison(s) + retour au point de départ
                    </Alert>
                </Card>
            )}
        </Stack>
    );
}
