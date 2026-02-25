import { Container, Grid, GridCol, Paper, Text, Title, Group, ThemeIcon, Stack, Card, Badge, SimpleGrid, Divider, Button } from '@mantine/core';
import { IconCoin, IconReceipt, IconUsers, IconChefHat, IconSalad, IconCake, IconSettings } from '@tabler/icons-react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect("/");
    }

    // Get total users
    const totalUsers = await prisma.user.count();

    // Get current week orders
    const today = dayjs();
    const startOfWeek = today.startOf('week').add(1, 'day').toDate();
    const endOfWeek = today.endOf('week').add(1, 'day').toDate();

    const weekOrders = await prisma.order.findMany({
        where: {
            createdAt: {
                gte: startOfWeek,
                lte: endOfWeek
            }
        },
        include: {
            menu: true,
            items: {
                include: {
                    item: true
                }
            }
        }
    });

    // Calculate total revenue
    const totalRevenue = weekOrders.reduce((sum, order) => sum + order.total, 0);

    // Get menus for the current week
    const weekMenus = await prisma.menu.findMany({
        where: {
            date: {
                gte: startOfWeek,
                lte: endOfWeek
            }
        },
        include: {
            items: true,
            orders: {
                include: {
                    items: {
                        include: {
                            item: true
                        }
                    }
                }
            }
        },
        orderBy: {
            date: 'asc'
        }
    });

    // Group orders by day and calculate item stats
    const dailyStats = weekMenus.map(menu => {
        const menuOrders = menu.orders;
        const itemsByCategory = {
            STARTER: 0,
            MAIN: 0,
            DESSERT: 0,
            DRINK: 0
        };

        menuOrders.forEach(order => {
            order.items.forEach(orderItem => {
                const category = orderItem.item.category;
                if (category in itemsByCategory) {
                    itemsByCategory[category as keyof typeof itemsByCategory]++;
                }
            });
        });

        return {
            date: menu.date,
            orderCount: menuOrders.length,
            revenue: menuOrders.reduce((sum, order) => sum + order.total, 0),
            items: itemsByCategory
        };
    });

    const stats = [
        { title: 'Utilisateurs inscrits', value: totalUsers.toString(), icon: IconUsers, color: 'teal' },
        { title: 'Commandes cette semaine', value: weekOrders.length.toString(), icon: IconReceipt, color: 'blue' },
        { title: 'CA de la semaine', value: `${totalRevenue.toFixed(2)}€`, icon: IconCoin, color: 'green' },
    ];

    return (
        <Container fluid>
            <Group justify="space-between" mb="lg">
                <Title order={2}>Tableau de bord</Title>
                <Link href="/admin/settings" style={{ textDecoration: 'none' }}>
                    <Button
                        variant="light"
                        leftSection={<IconSettings size={16} />}
                        size="sm"
                    >
                        Réglages
                    </Button>
                </Link>
            </Group>

            {/* Stats globales */}
            <Grid mb="xl">
                {stats.map((stat) => (
                    <GridCol key={stat.title} span={{ base: 12, sm: 6, md: 4 }}>
                        <Paper withBorder p="md" radius="md">
                            <Group justify="space-between">
                                <div>
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                                        {stat.title}
                                    </Text>
                                    <Text fw={700} size="xl">
                                        {stat.value}
                                    </Text>
                                </div>
                                <ThemeIcon
                                    color={stat.color}
                                    variant="light"
                                    size={38}
                                    radius="md"
                                >
                                    <stat.icon size="1.8rem" stroke={1.5} />
                                </ThemeIcon>
                            </Group>
                        </Paper>
                    </GridCol>
                ))}
            </Grid>

            {/* Détails par jour */}
            <Title order={3} mb="md">Commandes par jour (Semaine en cours)</Title>
            {dailyStats.length === 0 ? (
                <Text c="dimmed">Aucun menu configuré pour cette semaine.</Text>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                    {dailyStats.map((dayStat, index) => (
                        <Card key={index} withBorder shadow="sm" radius="md" p="md">
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text fw={600} size="lg">
                                        {dayjs(dayStat.date).format('dddd DD/MM')}
                                    </Text>
                                    <Badge color={dayStat.orderCount > 0 ? 'blue' : 'gray'} size="lg">
                                        {dayStat.orderCount} commande{dayStat.orderCount > 1 ? 's' : ''}
                                    </Badge>
                                </Group>

                                <Divider />

                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Chiffre d'affaire :</Text>
                                    <Text size="sm" fw={600} c="green">
                                        {dayStat.revenue.toFixed(2)} €
                                    </Text>
                                </Group>

                                <Divider />

                                <Text size="xs" fw={600} c="dimmed" tt="uppercase">Plats commandés :</Text>
                                <Stack gap={4}>
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <IconSalad size={16} />
                                            <Text size="sm">Entrées</Text>
                                        </Group>
                                        <Badge variant="light" color="orange">{dayStat.items.STARTER}</Badge>
                                    </Group>
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <IconChefHat size={16} />
                                            <Text size="sm">Plats</Text>
                                        </Group>
                                        <Badge variant="light" color="blue">{dayStat.items.MAIN}</Badge>
                                    </Group>
                                    <Group justify="space-between">
                                        <Group gap="xs">
                                            <IconCake size={16} />
                                            <Text size="sm">Desserts</Text>
                                        </Group>
                                        <Badge variant="light" color="pink">{dayStat.items.DESSERT}</Badge>
                                    </Group>
                                    {dayStat.items.DRINK > 0 && (
                                        <Group justify="space-between">
                                            <Group gap="xs">
                                                <Text size="sm">🥤 Boissons</Text>
                                            </Group>
                                            <Badge variant="light" color="cyan">{dayStat.items.DRINK}</Badge>
                                        </Group>
                                    )}
                                </Stack>
                            </Stack>
                        </Card>
                    ))}
                </SimpleGrid>
            )}
        </Container>
    );
}
