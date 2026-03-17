'use client';

import {
    Title,
    Group,
    Button,
    Stack,
    Card,
    Text,
    Badge,
    ActionIcon,
    TextInput,
    ColorInput,
    Alert,
    Paper,
    Grid,
    GridCol,
    Divider,
    ThemeIcon,
    Box,
} from '@mantine/core';
import {
    IconMapPin,
    IconTrash,
    IconPlus,
    IconX,
    IconCheck,
    IconArrowBackUp,
    IconInfoCircle,
    IconMapPins,
} from '@tabler/icons-react';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { notifications } from '@mantine/notifications';
import type { DeliveryZoneRow, ZonePoint } from './actions';
import { createZoneAction, deleteZoneAction } from './actions';

// Import Leaflet côté client uniquement (pas de SSR — Leaflet utilise window)
const ZoneMap = dynamic(() => import('./ZoneMap'), {
    ssr: false,
    loading: () => (
        <Box
            style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f1f3f5',
                borderRadius: 8,
            }}
        >
            <Text c="dimmed">Chargement de la carte...</Text>
        </Box>
    ),
});

const COLOR_PRESETS = [
    '#2f9e44', // vert
    '#1971c2', // bleu
    '#e03131', // rouge
    '#e67700', // orange
    '#7048e8', // violet
    '#0c8599', // cyan
    '#c2255c', // rose
    '#495057', // gris
];

interface Props {
    initialZones: DeliveryZoneRow[];
}

export function ZonesClient({ initialZones }: Props) {
    const [zones, setZones] = useState<DeliveryZoneRow[]>(initialZones);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingPoints, setDrawingPoints] = useState<ZonePoint[]>([]);
    const [newZoneName, setNewZoneName] = useState('');
    const [newZoneColor, setNewZoneColor] = useState('#2f9e44');
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleMapClick = useCallback((lat: number, lon: number) => {
        setDrawingPoints(prev => [...prev, { lat, lon }]);
    }, []);

    const handleUndoLastPoint = () => {
        setDrawingPoints(prev => prev.slice(0, -1));
    };

    const handleStartDrawing = () => {
        setIsDrawing(true);
        setDrawingPoints([]);
    };

    const handleCancelDrawing = () => {
        setIsDrawing(false);
        setDrawingPoints([]);
        setNewZoneName('');
        setNewZoneColor('#2f9e44');
    };

    const handleSaveZone = async () => {
        if (!newZoneName.trim() || drawingPoints.length < 3) return;

        setSaving(true);
        try {
            const res = await createZoneAction(newZoneName, newZoneColor, drawingPoints);
            if (res.success) {
                notifications.show({
                    title: 'Zone créée',
                    message: `"${newZoneName}" enregistrée avec ${drawingPoints.length} points.`,
                    color: 'green',
                });
                // Optimistic update : ajouter la zone localement sans recharger la page
                setZones(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        name: newZoneName,
                        color: newZoneColor,
                        polygon: drawingPoints,
                        createdAt: new Date(),
                        menuCount: 0,
                    },
                ]);
                handleCancelDrawing();
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Impossible de sauvegarder.', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteZone = async (id: string, name: string) => {
        if (!confirm(`Supprimer la zone "${name}" ? Les menus associés n'auront plus de zone.`)) return;

        setDeletingId(id);
        try {
            const res = await deleteZoneAction(id);
            if (res.success) {
                notifications.show({ title: 'Zone supprimée', message: `"${name}" a été supprimée.`, color: 'orange' });
                setZones(prev => prev.filter(z => z.id !== id));
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Impossible de supprimer.', color: 'red' });
        } finally {
            setDeletingId(null);
        }
    };

    const canSave = newZoneName.trim().length >= 2 && drawingPoints.length >= 3;

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Group gap="sm">
                    <IconMapPins size={28} color="#1971c2" />
                    <Title order={2}>Zones de Livraison</Title>
                </Group>
                {!isDrawing && (
                    <Button leftSection={<IconPlus size={16} />} onClick={handleStartDrawing}>
                        Créer une zone
                    </Button>
                )}
            </Group>

            <Grid gutter="lg" style={{ minHeight: '70vh' }}>
                {/* ── Colonne gauche : liste + panneau de dessin ── */}
                <GridCol span={{ base: 12, md: 4 }}>
                    <Stack gap="md" h="100%">

                        {/* Panneau de création (visible en mode dessin) */}
                        {isDrawing && (
                            <Paper withBorder p="md" radius="md" style={{ borderColor: '#ff6b35', borderWidth: 2 }}>
                                <Stack gap="sm">
                                    <Group gap="xs">
                                        <ThemeIcon color="orange" variant="light" size="sm">
                                            <IconMapPin size={14} />
                                        </ThemeIcon>
                                        <Text fw={600} size="sm">Nouvelle zone</Text>
                                    </Group>

                                    <TextInput
                                        label="Nom de la zone"
                                        placeholder="Paris Ouest, Zone Nord..."
                                        value={newZoneName}
                                        onChange={e => setNewZoneName(e.currentTarget.value)}
                                        size="sm"
                                    />

                                    <ColorInput
                                        label="Couleur sur la carte"
                                        value={newZoneColor}
                                        onChange={setNewZoneColor}
                                        swatches={COLOR_PRESETS}
                                        size="sm"
                                    />

                                    <Divider />

                                    <Alert
                                        icon={<IconInfoCircle size={16} />}
                                        color="blue"
                                        variant="light"
                                        p="xs"
                                    >
                                        <Text size="xs">
                                            Cliquez sur la carte pour ajouter des points.
                                            Il en faut <strong>au moins 3</strong> pour fermer le polygon.
                                        </Text>
                                    </Alert>

                                    <Group justify="space-between" align="center">
                                        <Badge
                                            color={drawingPoints.length >= 3 ? 'green' : 'gray'}
                                            variant="light"
                                            size="lg"
                                        >
                                            {drawingPoints.length} point{drawingPoints.length > 1 ? 's' : ''}
                                        </Badge>
                                        <Button
                                            size="xs"
                                            variant="subtle"
                                            color="gray"
                                            leftSection={<IconArrowBackUp size={14} />}
                                            onClick={handleUndoLastPoint}
                                            disabled={drawingPoints.length === 0}
                                        >
                                            Annuler dernier
                                        </Button>
                                    </Group>

                                    <Group grow>
                                        <Button
                                            variant="default"
                                            leftSection={<IconX size={16} />}
                                            onClick={handleCancelDrawing}
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            leftSection={<IconCheck size={16} />}
                                            disabled={!canSave}
                                            loading={saving}
                                            onClick={handleSaveZone}
                                            color="green"
                                        >
                                            Enregistrer
                                        </Button>
                                    </Group>
                                </Stack>
                            </Paper>
                        )}

                        {/* Liste des zones existantes */}
                        {zones.length === 0 ? (
                            <Paper withBorder p="lg" radius="md" style={{ textAlign: 'center' }}>
                                <Text c="dimmed" size="sm">Aucune zone créée.</Text>
                                <Text c="dimmed" size="xs" mt={4}>
                                    Créez une zone pour restreindre la livraison d'un menu à un périmètre géographique.
                                </Text>
                            </Paper>
                        ) : (
                            <Stack gap="xs">
                                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                                    {zones.length} zone{zones.length > 1 ? 's' : ''} existante{zones.length > 1 ? 's' : ''}
                                </Text>
                                {zones.map(zone => (
                                    <Card key={zone.id} withBorder shadow="xs" radius="md" p="sm">
                                        <Group justify="space-between" align="flex-start">
                                            <Group gap="xs" style={{ flex: 1 }}>
                                                <Box
                                                    style={{
                                                        width: 14,
                                                        height: 14,
                                                        borderRadius: 3,
                                                        background: zone.color,
                                                        flexShrink: 0,
                                                        marginTop: 3,
                                                    }}
                                                />
                                                <Stack gap={2} style={{ flex: 1 }}>
                                                    <Text fw={600} size="sm">{zone.name}</Text>
                                                    <Group gap="xs">
                                                        <Text size="xs" c="dimmed">{zone.polygon.length} pts</Text>
                                                        {zone.menuCount > 0 && (
                                                            <Badge size="xs" color="blue" variant="light">
                                                                {zone.menuCount} menu{zone.menuCount > 1 ? 's' : ''}
                                                            </Badge>
                                                        )}
                                                    </Group>
                                                </Stack>
                                            </Group>
                                            <ActionIcon
                                                color="red"
                                                variant="subtle"
                                                size="sm"
                                                onClick={() => handleDeleteZone(zone.id, zone.name)}
                                                loading={deletingId === zone.id}
                                            >
                                                <IconTrash size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </Card>
                                ))}
                            </Stack>
                        )}
                    </Stack>
                </GridCol>

                {/* ── Colonne droite : carte ── */}
                <GridCol span={{ base: 12, md: 8 }} style={{ minHeight: 500 }}>
                    <ZoneMap
                        zones={zones}
                        drawingPoints={drawingPoints}
                        isDrawing={isDrawing}
                        onMapClick={handleMapClick}
                    />
                </GridCol>
            </Grid>
        </Stack>
    );
}
