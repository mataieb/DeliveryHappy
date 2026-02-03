'use client';

import { Container, Title, Text } from '@mantine/core';

export default function OrdersPage() {
    return (
        <Container fluid>
            <Title order={2} mb="lg">Commandes</Title>
            <Text c="dimmed">La liste des commandes apparaîtra ici.</Text>
        </Container>
    );
}
