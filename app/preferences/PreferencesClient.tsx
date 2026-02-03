'use client';

import {
    Container,
    Title,
    Paper,
    Group,
    Text,
    Button,
    Stack,
    Chip,
    Divider,
    SimpleGrid,
    Card,
    ActionIcon,
    Modal,
    TextInput,
    Textarea
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconPlus, IconMapPin, IconDeviceFloppy, IconPencil } from '@tabler/icons-react';
import { useState } from 'react';
import { updateDietaryPreferences, addAddressAction, deleteAddressAction, updateAddressAction } from './actions';
import { DietaryOption, Address } from '@prisma/client';

const DIETARY_LABELS: Record<string, string> = {
    'VEGETARIAN': 'Végétarien',
    'VEGAN': 'Vegan',
    'HALAL': 'Halal',
    'GLUTEN_FREE': 'Sans Gluten',
    'SPICY': 'Épicé'
};

type UserWithAddresses = {
    dietaryPreferences: DietaryOption[];
    addresses: Address[];
};

export default function PreferencesClient({ user }: { user: UserWithAddresses }) {
    const [dietary, setDietary] = useState<string[]>(user.dietaryPreferences);
    const [loadingInfo, { toggle: setLoadingInfo }] = useDisclosure(false);

    // Address Modal
    const [opened, { open, close }] = useDisclosure(false);
    const [addressLoading, { toggle: setAddressLoading }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const addressForm = useForm({
        initialValues: {
            label: '',
            content: '',
            details: '',
        },
        validate: {
            label: (val) => (val.length < 2 ? 'Nom trop court' : null),
            content: (val) => (val.length < 5 ? 'Adresse trop courte' : null),
        },
    });

    const handleSaveDietary = async () => {
        setLoadingInfo();
        try {
            const res = await updateDietaryPreferences(dietary as DietaryOption[]);
            if (res.success) {
                notifications.show({ title: 'Succès', message: 'Préférences enregistrées', color: 'green' });
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } finally {
            setLoadingInfo();
        }
    };

    const handleOpenNew = () => {
        setEditingId(null);
        addressForm.reset();
        open();
    };

    const handleEdit = (addr: Address) => {
        setEditingId(addr.id);
        addressForm.setValues({
            label: addr.label,
            content: addr.content,
            // @ts-ignore
            details: addr.details || '',
        });
        open();
    };

    const handleSaveAddress = async (values: typeof addressForm.values) => {
        setAddressLoading();
        try {
            let res;
            if (editingId) {
                res = await updateAddressAction(editingId, values.label, values.content, values.details);
            } else {
                res = await addAddressAction(values.label, values.content, values.details);
            }

            if (res.success) {
                notifications.show({
                    title: 'Succès',
                    message: editingId ? 'Adresse mise à jour' : 'Adresse ajoutée',
                    color: 'green'
                });
                close();
                addressForm.reset();
                setEditingId(null);
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } finally {
            setAddressLoading();
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (!confirm('Supprimer cette adresse ?')) return;
        try {
            const res = await deleteAddressAction(id);
            if (res.success) {
                notifications.show({ title: 'Succès', message: 'Adresse supprimée', color: 'green' });
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch (error) {
            notifications.show({ title: 'Erreur', message: 'Erreur inconnue', color: 'red' });
        }
    };

    return (
        <Container size="md" py="xl">
            <Title order={2} mb="lg">Mon Profil & Préférences</Title>

            <Paper withBorder p="lg" radius="md" mb="xl">
                <Group justify="space-between" mb="md">
                    <Title order={4}>Régime Alimentaire</Title>
                    <Button
                        leftSection={<IconDeviceFloppy size={16} />}
                        onClick={handleSaveDietary}
                        loading={loadingInfo}
                        variant="light"
                    >
                        Enregistrer
                    </Button>
                </Group>
                <Text size="sm" c="dimmed" mb="md">
                    Sélectionnez vos contraintes alimentaires. Ces informations seront utilisées pour filtrer les menus et alerter les chefs.
                </Text>

                <Chip.Group multiple value={dietary} onChange={setDietary}>
                    <Group gap="xs">
                        {Object.entries(DIETARY_LABELS).map(([key, label]) => (
                            <Chip key={key} value={key} variant="outline" radius="sm">
                                {label}
                            </Chip>
                        ))}
                    </Group>
                </Chip.Group>
            </Paper>

            <Paper withBorder p="lg" radius="md">
                <Group justify="space-between" mb="md">
                    <Title order={4}>Mes Adresses de Livraison</Title>
                    <Button leftSection={<IconPlus size={16} />} onClick={handleOpenNew} variant="light">
                        Nouvelle Adresse
                    </Button>
                </Group>

                {user.addresses.length === 0 ? (
                    <Text c="dimmed" fs="italic">Aucune adresse enregistrée.</Text>
                ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        {user.addresses.map(addr => (
                            <Card key={addr.id} withBorder shadow="sm" radius="md">
                                <Group justify="space-between" align="flex-start" mb="xs">
                                    <Group gap="xs">
                                        <IconMapPin size={16} color="gray" />
                                        <Text fw={600}>{addr.label}</Text>
                                    </Group>
                                    <Group gap={0}>
                                        <ActionIcon color="blue" variant="subtle" onClick={() => handleEdit(addr)}>
                                            <IconPencil size={16} />
                                        </ActionIcon>
                                        <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteAddress(addr.id)}>
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                                <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                                    {addr.content}
                                </Text>
                                {addr.details && (
                                    <Text size="xs" c="dimmed" mt={4}>
                                        {addr.details}
                                    </Text>
                                )}
                            </Card>
                        ))}
                    </SimpleGrid>
                )}
            </Paper>

            <Modal opened={opened} onClose={close} title={editingId ? "Modifier l'adresse" : "Ajouter une adresse"}>
                <form onSubmit={addressForm.onSubmit(handleSaveAddress)}>
                    <Stack>
                        <TextInput
                            label="Nom (ex: Bureau, Maison)"
                            placeholder="Bureau"
                            withAsterisk
                            {...addressForm.getInputProps('label')}
                        />
                        <Textarea
                            label="Adresse Complète"
                            placeholder="32 Rue de..."
                            withAsterisk
                            minRows={3}
                            {...addressForm.getInputProps('content')}
                        />
                        <TextInput
                            label="Complément"
                            placeholder="Code: 1234, Etage..."
                            {...addressForm.getInputProps('details')}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="default" onClick={close}>Annuler</Button>
                            <Button type="submit" loading={addressLoading}>{editingId ? "Enregistrer" : "Ajouter"}</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
}
