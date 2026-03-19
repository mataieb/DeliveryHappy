'use client';

import { useState } from 'react';
import {
    Table, Badge, Button, Group, Text, Avatar, Tooltip, ActionIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconShieldCheck, IconShieldOff, IconTrophy } from '@tabler/icons-react';
import { changeUserRoleAction } from './actions';
import dayjs from 'dayjs';

type UserRow = {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: 'USER' | 'ADMIN';
    orderCount: number;
    createdAt: Date;
    currentUserId: string;
};

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <Text span fw={700} c="yellow.6">🥇</Text>;
    if (rank === 2) return <Text span fw={700} c="gray.5">🥈</Text>;
    if (rank === 3) return <Text span fw={700} c="orange.7">🥉</Text>;
    return <Text span c="dimmed" size="sm">#{rank}</Text>;
}

export default function UsersClient({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [roles, setRoles] = useState<Record<string, 'USER' | 'ADMIN'>>(
        Object.fromEntries(users.map(u => [u.id, u.role]))
    );

    const handleToggleRole = async (userId: string, currentRole: 'USER' | 'ADMIN') => {
        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        setLoadingId(userId);
        const res = await changeUserRoleAction(userId, newRole);
        setLoadingId(null);
        if (res.success) {
            setRoles(prev => ({ ...prev, [userId]: newRole }));
            notifications.show({
                title: 'Rôle mis à jour',
                message: `Rôle changé en ${newRole}`,
                color: 'green',
            });
        } else {
            notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
        }
    };

    const rows = users.map((user, index) => {
        const role = roles[user.id];
        const isCurrentUser = user.id === currentUserId;

        return (
            <Table.Tr key={user.id}>
                <Table.Td>
                    <Group gap="xs">
                        <RankBadge rank={index + 1} />
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Group gap="sm">
                        <Avatar src={user.image} size={32} radius="xl" name={user.name ?? user.email} color="initials" />
                        <div>
                            <Text size="sm" fw={500}>{user.name ?? '—'}</Text>
                            <Text size="xs" c="dimmed">{user.email}</Text>
                        </div>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Badge
                        color={role === 'ADMIN' ? 'orange' : 'blue'}
                        variant="light"
                        leftSection={role === 'ADMIN' ? <IconShieldCheck size={12} /> : null}
                    >
                        {role === 'ADMIN' ? 'Admin' : 'Utilisateur'}
                    </Badge>
                </Table.Td>
                <Table.Td>
                    <Group gap="xs">
                        <IconTrophy size={14} color={user.orderCount > 0 ? '#fab005' : '#adb5bd'} />
                        <Text size="sm" fw={user.orderCount > 0 ? 600 : 400} c={user.orderCount === 0 ? 'dimmed' : undefined}>
                            {user.orderCount}
                        </Text>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Text size="xs" c="dimmed">{dayjs(user.createdAt).format('DD/MM/YYYY')}</Text>
                </Table.Td>
                <Table.Td>
                    {isCurrentUser ? (
                        <Text size="xs" c="dimmed" fs="italic">Vous</Text>
                    ) : (
                        <Tooltip label={role === 'ADMIN' ? 'Rétrograder en utilisateur' : 'Promouvoir en admin'}>
                            <ActionIcon
                                variant="light"
                                color={role === 'ADMIN' ? 'red' : 'orange'}
                                loading={loadingId === user.id}
                                onClick={() => handleToggleRole(user.id, role)}
                                size="sm"
                            >
                                {role === 'ADMIN' ? <IconShieldOff size={14} /> : <IconShieldCheck size={14} />}
                            </ActionIcon>
                        </Tooltip>
                    )}
                </Table.Td>
            </Table.Tr>
        );
    });

    return (
        <Table.ScrollContainer minWidth={600}>
            <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th w={50}>Rang</Table.Th>
                        <Table.Th>Utilisateur</Table.Th>
                        <Table.Th>Rôle</Table.Th>
                        <Table.Th>Commandes</Table.Th>
                        <Table.Th>Inscrit le</Table.Th>
                        <Table.Th w={60}>Action</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    );
}
