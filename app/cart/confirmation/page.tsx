'use client';

import { Container, Title, Text, Button, Stack, ThemeIcon, Group } from '@mantine/core';
import { IconCheck, IconShoppingBag, IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';

export default function OrderConfirmationPage() {
    return (
        <Container size="sm" py="xl">
            <Stack align="center" gap="xl" py="xl">
                <ThemeIcon size={100} radius={100} variant="light" color="green">
                    <IconCheck size={55} />
                </ThemeIcon>

                <Stack align="center" gap="xs">
                    <Title order={2} ta="center">Commande validée !</Title>
                    <Text c="dimmed" ta="center" maw={400}>
                        Votre commande a bien été enregistrée. Vous serez livré entre 11h et 13h.
                        Vous pouvez suivre son statut dans vos commandes.
                    </Text>
                </Stack>

                <Group>
                    <Button
                        component={Link}
                        href="/menu"
                        variant="light"
                        leftSection={<IconArrowLeft size={16} />}
                    >
                        Retour au menu
                    </Button>
                    <Button
                        component={Link}
                        href="/orders"
                        leftSection={<IconShoppingBag size={16} />}
                    >
                        Voir mes commandes
                    </Button>
                </Group>
            </Stack>
        </Container>
    );
}
