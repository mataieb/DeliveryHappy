'use client';

import { Container, Grid, Paper, Text, Title, Group, ThemeIcon } from '@mantine/core';
import { IconCoin, IconReceipt, IconUsers } from '@tabler/icons-react';

export default function AdminDashboard() {
    const stats = [
        { title: 'Commandes du jour', value: '12', icon: IconReceipt, color: 'blue' },
        { title: 'Chiffre d\'affaire', value: '145.00€', icon: IconCoin, color: 'green' },
        { title: 'Utilisateurs actifs', value: '25', icon: IconUsers, color: 'teal' },
    ];

    return (
        <Container fluid>
            <Title order={2} mb="lg">Tableau de bord</Title>

            <Grid>
                {stats.map((stat) => (
                    <Grid.Col key={stat.title} span={{ base: 12, sm: 6, md: 4 }}>
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
                    </Grid.Col>
                ))}
            </Grid>
        </Container>
    );
}
