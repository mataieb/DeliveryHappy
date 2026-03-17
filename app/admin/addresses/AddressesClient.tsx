'use client';

import {
    Container,
    Title,
    Table,
    Badge,
    Text,
    Group,
    Paper,
    Stack,
    Box,
    Grid,
    GridCol,
} from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import dynamic from 'next/dynamic';

const AddressesMap = dynamic(() => import('./AddressesMap'), {
    ssr: false,
    loading: () => (
        <Box style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f3f5', borderRadius: 8 }}>
            <Text c="dimmed">Chargement de la carte...</Text>
        </Box>
    ),
});

type AddressRow = {
    id: string;
    label: string;
    type: 'DOMICILE' | 'BUREAU';
    content: string;
    details: string | null;
    lat: number | null;
    lon: number | null;
    user: { name: string | null; email: string };
};

export function AddressesClient({ addresses }: { addresses: AddressRow[] }) {
    const domicileCount = addresses.filter(a => a.type === 'DOMICILE').length;
    const bureauCount = addresses.filter(a => a.type === 'BUREAU').length;
    const withCoordsCount = addresses.filter(a => a.lat && a.lon).length;

    return (
        <Container size="xl" py="xl">
            <Group mb="lg" gap="xs">
                <IconMapPin size={24} />
                <Title order={2}>Adresses de livraison</Title>
            </Group>

            <Group mb="xl" gap="md">
                <Paper withBorder p="md" radius="md">
                    <Stack gap={2}>
                        <Text size="xs" c="dimmed">Total</Text>
                        <Text fw={700} size="xl">{addresses.length}</Text>
                    </Stack>
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Stack gap={2}>
                        <Text size="xs" c="dimmed">Domiciles</Text>
                        <Text fw={700} size="xl" c="green">{domicileCount}</Text>
                    </Stack>
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Stack gap={2}>
                        <Text size="xs" c="dimmed">Bureaux</Text>
                        <Text fw={700} size="xl" c="blue">{bureauCount}</Text>
                    </Stack>
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Stack gap={2}>
                        <Text size="xs" c="dimmed">Géolocalisées</Text>
                        <Text fw={700} size="xl" c="orange">{withCoordsCount}</Text>
                    </Stack>
                </Paper>
            </Group>

            <Grid gutter="lg" mb="xl">
                <GridCol span={{ base: 12, md: 8 }} style={{ minHeight: 450 }}>
                    <Paper withBorder radius="md" style={{ height: 450, overflow: 'hidden' }}>
                        <AddressesMap addresses={addresses} />
                    </Paper>
                </GridCol>
                <GridCol span={{ base: 12, md: 4 }}>
                    <Paper withBorder p="md" radius="md" style={{ height: 450, overflowY: 'auto' }}>
                        <Text fw={600} size="sm" mb="sm">Légende</Text>
                        <Stack gap="xs" mb="md">
                            <Group gap="xs">
                                <Box style={{ width: 14, height: 14, borderRadius: '50%', background: '#2f9e44', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', flexShrink: 0 }} />
                                <Text size="sm">Domicile ({domicileCount})</Text>
                            </Group>
                            <Group gap="xs">
                                <Box style={{ width: 14, height: 14, borderRadius: '50%', background: '#1971c2', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', flexShrink: 0 }} />
                                <Text size="sm">Bureau ({bureauCount})</Text>
                            </Group>
                        </Stack>
                        <Text size="xs" c="dimmed" mb="sm">{withCoordsCount} / {addresses.length} adresses géolocalisées</Text>
                        {addresses.filter(a => !a.lat || !a.lon).length > 0 && (
                            <Stack gap={4}>
                                <Text size="xs" fw={600} c="red">Non géolocalisées :</Text>
                                {addresses.filter(a => !a.lat || !a.lon).map(addr => (
                                    <Text key={addr.id} size="xs" c="dimmed">• {addr.content}</Text>
                                ))}
                            </Stack>
                        )}
                    </Paper>
                </GridCol>
            </Grid>

            <Paper withBorder radius="md">
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Utilisateur</Table.Th>
                            <Table.Th>Nom</Table.Th>
                            <Table.Th>Type</Table.Th>
                            <Table.Th>Adresse</Table.Th>
                            <Table.Th>Complément</Table.Th>
                            <Table.Th>Coordonnées</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {addresses.map(addr => (
                            <Table.Tr key={addr.id}>
                                <Table.Td>
                                    <Stack gap={0}>
                                        <Text size="sm" fw={500}>{addr.user.name ?? '—'}</Text>
                                        <Text size="xs" c="dimmed">{addr.user.email}</Text>
                                    </Stack>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm">{addr.label}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Badge size="sm" variant="light" color={addr.type === 'BUREAU' ? 'blue' : 'green'}>
                                        {addr.type === 'BUREAU' ? 'Bureau' : 'Domicile'}
                                    </Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm">{addr.content}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm" c="dimmed">{addr.details ?? '—'}</Text>
                                </Table.Td>
                                <Table.Td>
                                    {addr.lat && addr.lon ? (
                                        <Text size="xs" c="dimmed" ff="monospace">
                                            {addr.lat.toFixed(5)}, {addr.lon.toFixed(5)}
                                        </Text>
                                    ) : (
                                        <Badge size="xs" color="red" variant="light">Manquant</Badge>
                                    )}
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
                {addresses.length === 0 && (
                    <Text p="xl" c="dimmed" ta="center">Aucune adresse enregistrée.</Text>
                )}
            </Paper>
        </Container>
    );
}
