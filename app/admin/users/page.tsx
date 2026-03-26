import { Container, Title, Paper, Group, Text, SimpleGrid, ThemeIcon, Stack } from '@mantine/core';
import { IconUsers, IconShieldCheck, IconTrophy } from '@tabler/icons-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import UsersClient from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/');
    }

    const users = await prisma.user.findMany({
        include: {
            _count: { select: { orders: true } },
        },
        orderBy: {
            orders: { _count: 'desc' },
        },
    });

    const userRows = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        role: u.role as 'USER' | 'ADMIN',
        orderCount: u._count.orders,
        createdAt: u.createdAt,
        currentUserId: session.user.id,
        phoneNumber: u.phoneNumber ?? null,
    }));

    const totalAdmins = users.filter(u => u.role === 'ADMIN').length;
    const topOrderer = users[0];

    return (
        <Container fluid>
            <Title order={2} mb="lg">Gestion des Utilisateurs</Title>

            <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total utilisateurs</Text>
                            <Text fw={700} size="xl">{users.length}</Text>
                        </Stack>
                        <ThemeIcon color="teal" variant="light" size={38} radius="md">
                            <IconUsers size="1.5rem" stroke={1.5} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Admins</Text>
                            <Text fw={700} size="xl">{totalAdmins}</Text>
                        </Stack>
                        <ThemeIcon color="orange" variant="light" size={38} radius="md">
                            <IconShieldCheck size="1.5rem" stroke={1.5} />
                        </ThemeIcon>
                    </Group>
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Top commandeur</Text>
                            <Text fw={700} size="sm" truncate>
                                {topOrderer ? `${topOrderer.name ?? topOrderer.email} (${topOrderer._count.orders})` : '—'}
                            </Text>
                        </Stack>
                        <ThemeIcon color="yellow" variant="light" size={38} radius="md">
                            <IconTrophy size="1.5rem" stroke={1.5} />
                        </ThemeIcon>
                    </Group>
                </Paper>
            </SimpleGrid>

            <Paper withBorder radius="md" p="md">
                <Title order={4} mb="md">Leaderboard des commandes</Title>
                <UsersClient users={userRows} currentUserId={session.user.id} />
            </Paper>
        </Container>
    );
}
