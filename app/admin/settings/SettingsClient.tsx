'use client';

import {
    Card, Title, Text, Group, Stack, Switch, Badge, Alert, Divider
} from '@mantine/core';
import { IconPackage, IconAlertCircle, IconSettings } from '@tabler/icons-react';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { setTupperwareEnabledAction } from './actions';

interface Props {
    initialTupperwareEnabled: boolean;
}

export function SettingsClient({ initialTupperwareEnabled }: Props) {
    const [tupperwareEnabled, setTupperwareEnabled] = useState(initialTupperwareEnabled);
    const [loading, setLoading] = useState(false);

    const handleToggleTupperware = async (enabled: boolean) => {
        setLoading(true);
        try {
            await setTupperwareEnabledAction(enabled);
            setTupperwareEnabled(enabled);
            notifications.show({
                title: 'Réglage mis à jour',
                message: enabled
                    ? '✅ Tupperware activé — les clients peuvent à nouveau le choisir.'
                    : '🚫 Tupperware désactivé — les clients voient l\'option grisée.',
                color: enabled ? 'green' : 'orange',
            });
        } catch {
            notifications.show({ title: 'Erreur', message: 'Mise à jour impossible.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack gap="lg" maw={680}>
            <Group>
                <IconSettings size={28} color="#1971c2" />
                <Title order={2}>Réglages de l'application</Title>
            </Group>

            {/* ── Packaging section ── */}
            <Card withBorder shadow="sm" radius="md" p="lg">
                <Group mb="md">
                    <IconPackage size={20} color="#e67700" />
                    <Text fw={600} size="lg">Emballage &amp; Contenants</Text>
                </Group>

                <Divider mb="md" />

                <Group justify="space-between" align="flex-start">
                    <Stack gap={4} style={{ flex: 1 }}>
                        <Group gap="xs">
                            <Text fw={500}>Option Tupperware (Consigne)</Text>
                            <Badge
                                size="sm"
                                color={tupperwareEnabled ? 'green' : 'orange'}
                                variant="light"
                            >
                                {tupperwareEnabled ? 'Activé' : 'Désactivé'}
                            </Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                            Quand désactivé, les clients voient la section Tupperware grisée et ne peuvent
                            pas la sélectionner. L'option Carton est automatiquement pré-sélectionnée.
                        </Text>
                    </Stack>
                    <Switch
                        size="lg"
                        checked={tupperwareEnabled}
                        onChange={(e) => handleToggleTupperware(e.currentTarget.checked)}
                        disabled={loading}
                        color="green"
                        onLabel="ON"
                        offLabel="OFF"
                    />
                </Group>

                {!tupperwareEnabled && (
                    <Alert
                        icon={<IconAlertCircle size={16} />}
                        color="orange"
                        mt="md"
                        title="Option désactivée"
                    >
                        <Text size="sm">
                            Les clients voient actuellement l'option Tupperware <b>grisée et non cliquable</b>.
                            Le carton est automatiquement sélectionné. Réactivez pour votre prochain service si vous avez des Tupperware disponibles.
                        </Text>
                    </Alert>
                )}
            </Card>
        </Stack>
    );
}
