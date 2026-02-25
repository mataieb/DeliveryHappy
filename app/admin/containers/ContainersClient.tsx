'use client';

import { useState } from 'react';
import { Container, Title, Text, Table, Tabs, Card, Badge, Stack, Grid, Button, Group } from '@mantine/core';
import { manualDecrementAction } from './actions';
import { notifications } from '@mantine/notifications';

export default function ContainersClient({ debtors, menus, totalStock, currentOutstanding }: any) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    let cumulativeTaken = 0; // Tupp took since "now" (accumulated)
    let cumulativeReturned = 0; // Tupp returned since "now"

    const handleManualReturn = async (userId: string, currentBalance: number) => {
        if (currentBalance <= 0) return;
        setLoadingId(userId);
        try {
            const res = await manualDecrementAction(userId);
            if (res.success) {
                notifications.show({ title: 'Kudos', message: 'Tupperware rendu manuellement', color: 'green' });
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch (e) {
            notifications.show({ title: 'Erreur', message: 'Une erreur est survenue', color: 'red' });
        } finally {
            setLoadingId(null);
        }
    };

    const forecastRows = menus.map((menu: any) => {
        // @ts-ignore
        const tuppOrders = menu.orders.filter((o: any) => o.packaging === 'TUPPERWARE').length;
        const returns = menu.orders.filter((o: any) => o.isReturningContainer).length;

        // Availability for THIS day (before this day's operations):
        // Limit = 45 - Oustanding - (Previously Taken) + (Previously Returned)
        // Note: returns on day D do not help day D's service (assuming they are returned AT delivery time)
        const startOfDayStock = totalStock - currentOutstanding - cumulativeTaken + cumulativeReturned;

        // Update cumulatives for NEXT day
        cumulativeTaken += tuppOrders;
        cumulativeReturned += returns;

        const endOfDayStock = totalStock - currentOutstanding - cumulativeTaken + cumulativeReturned;

        return (
            <Table.Tr key={menu.id}>
                <Table.Td>{new Date(menu.date).toLocaleDateString()}</Table.Td>
                <Table.Td>{tuppOrders}</Table.Td>
                <Table.Td>{returns}</Table.Td>
                <Table.Td>
                    {/* If Start Stock is less than demand, that's a problem (already validated but good to see) */}
                    {/* If Start Stock < 0, big problem */}
                    <Badge color={startOfDayStock < 0 ? 'red' : 'green'}>
                        {startOfDayStock}
                    </Badge>
                </Table.Td>
                <Table.Td>{endOfDayStock}</Table.Td>
            </Table.Tr>
        );
    });

    return (
        <Container fluid py="xl">
            <Title mb="xl">Gestion des Tupperwares</Title>

            <Grid mb="xl">
                <Grid.Col span={4}>
                    <Card withBorder padding="xl">
                        <Stack align="center">
                            <Text fw={700}>Stock Total</Text>
                            <Title>{totalStock}</Title>
                        </Stack>
                    </Card>
                </Grid.Col>
                <Grid.Col span={4}>
                    <Card withBorder padding="xl">
                        <Stack align="center">
                            <Text fw={700}>Actuellement Dehors</Text>
                            <Title c="blue">{currentOutstanding}</Title>
                        </Stack>
                    </Card>
                </Grid.Col>
                <Grid.Col span={4}>
                    <Card withBorder padding="xl">
                        <Stack align="center">
                            <Text fw={700}>Disponibles (Immédiat)</Text>
                            <Title c="green">{totalStock - currentOutstanding}</Title>
                        </Stack>
                    </Card>
                </Grid.Col>
            </Grid>

            <Tabs defaultValue="forecast">
                <Tabs.List>
                    <Tabs.Tab value="forecast">Prévisions & Stock</Tabs.Tab>
                    <Tabs.Tab value="debtors">Suivi Utilisateurs ({debtors.length})</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="forecast" pt="xl">
                    <Card withBorder>
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Date</Table.Th>
                                    <Table.Th>Sorties (Commandes)</Table.Th>
                                    <Table.Th>Entrées (Retours)</Table.Th>
                                    <Table.Th>Disponible (Début)</Table.Th>
                                    <Table.Th>Stock Fin (Estimé)</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>{forecastRows}</Table.Tbody>
                        </Table>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="debtors" pt="xl">
                    <Card withBorder>
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Utilisateur</Table.Th>
                                    <Table.Th>Email</Table.Th>
                                    <Table.Th>Tupperwares à rendre</Table.Th>
                                    <Table.Th>Action</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {debtors.map((u: any) => (
                                    <Table.Tr key={u.id}>
                                        <Table.Td>{u.name}</Table.Td>
                                        <Table.Td>{u.email}</Table.Td>
                                        <Table.Td><Badge size="lg" circle>{u.containerBalance}</Badge></Table.Td>
                                        <Table.Td>
                                            <Button
                                                size="xs"
                                                variant="light"
                                                color="blue"
                                                onClick={() => handleManualReturn(u.id, u.containerBalance)}
                                                loading={loadingId === u.id}
                                            >
                                                Rendu manuel (-1)
                                            </Button>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
}
