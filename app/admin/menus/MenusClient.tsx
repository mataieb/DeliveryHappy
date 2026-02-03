'use client';

import {
    Button,
    Container,
    Group,
    Title,
    Text,
    Modal,
    TextInput,
    NumberInput,
    Select,
    ActionIcon,
    Stack,
    Box,
    Card,
    Badge,
    Grid,
    MultiSelect,
    Tooltip,
    Textarea
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash, IconPencil } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createMenuAction, updateMenuAction, deleteMenuAction, MenuItemInput } from './actions';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useState } from 'react';

// Enum matches Prisma
const CATEGORIES = [
    { value: 'STARTER', label: 'Entrée' },
    { value: 'MAIN', label: 'Plat' },
    { value: 'DESSERT', label: 'Dessert' },
    { value: 'DRINK', label: 'Boisson' },
];

const DIETARY_OPTIONS = [
    { value: 'VEGETARIAN', label: 'Végétarien' },
    { value: 'VEGAN', label: 'Vegan' },
    { value: 'HALAL', label: 'Halal' },
    { value: 'GLUTEN_FREE', label: 'Sans Gluten' },
    { value: 'SPICY', label: 'Épicé' },
];

type MenuWithItems = {
    id: string;
    date: Date;
    items: {
        id: string;
        name: string;
        description: string | null;
        ingredients: string | null;
        price: number;
        category: string;
        dietaryOptions: string[];
    }[];
};

export default function MenusClient({ menus }: { menus: MenuWithItems[] }) {
    const [opened, { open, close }] = useDisclosure(false);
    const [loading, { toggle: setLoading }] = useDisclosure(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const form = useForm({
        initialValues: {
            date: new Date(),
            items: [
                { name: '', description: '', ingredients: '', price: 0, category: 'MAIN', dietaryOptions: [] }
            ] as MenuItemInput[],
        },
        validate: {
            date: (value) => (value ? null : 'Date requise'),
            items: {
                name: (value) => (value.length < 2 ? 'Nom trop court' : null),
                price: (value) => (value < 0 ? 'Prix invalide' : null),
            },
        },
    });

    const handleClose = () => {
        close();
        setEditingId(null);
        form.reset();
    };

    const handleEdit = (menu: MenuWithItems) => {
        setEditingId(menu.id);
        form.setValues({
            date: new Date(menu.date),
            items: menu.items.map(item => ({
                id: item.id,
                name: item.name,
                description: item.description || '',
                ingredients: item.ingredients || '',
                price: item.price,
                category: item.category as any,
                dietaryOptions: item.dietaryOptions as any,
            }))
        });
        open();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce menu ? Cette action est irréversible.')) return;

        try {
            const result = await deleteMenuAction(id);
            if (result.success) {
                notifications.show({ title: 'Supprimé', message: 'Le menu a été supprimé', color: 'blue' });
            } else {
                notifications.show({ title: 'Erreur', message: result.error, color: 'red' });
            }
        } catch (e) {
            notifications.show({ title: 'Erreur', message: 'Erreur lors de la suppression', color: 'red' });
        }
    };

    const handleSubmit = async (values: typeof form.values) => {
        setLoading();
        try {
            let result;
            if (editingId) {
                result = await updateMenuAction(editingId, values.date, values.items);
            } else {
                result = await createMenuAction(values.date, values.items);
            }

            if (result.success) {
                notifications.show({
                    title: 'Succès',
                    message: editingId ? 'Menu mis à jour' : 'Menu créé',
                    color: 'green',
                });
                handleClose();
            } else {
                notifications.show({
                    title: 'Erreur',
                    message: result.error,
                    color: 'red',
                });
            }
        } catch (e) {
            notifications.show({
                title: 'Erreur',
                message: 'Une erreur inconnue est survenue',
                color: 'red',
            });
        } finally {
            setLoading();
        }
    };

    const addItem = () => {
        form.insertListItem('items', { name: '', description: '', ingredients: '', price: 0, category: 'MAIN', dietaryOptions: [] });
    };

    const removeItem = (index: number) => {
        form.removeListItem('items', index);
    };

    return (
        <Container fluid>
            <Group justify="space-between" mb="lg">
                <Title order={2}>Gestion des Menus</Title>
                <Button leftSection={<IconPlus size={14} />} onClick={open}>Nouveau Menu</Button>
            </Group>

            {menus.length === 0 ? (
                <Text c="dimmed">Aucun menu pour le moment.</Text>
            ) : (
                <Grid>
                    {menus.map((menu) => (
                        <Grid.Col key={menu.id} span={{ base: 12, md: 6, lg: 4 }}>
                            <Card withBorder padding="lg" radius="md">
                                <Card.Section withBorder inheritPadding py="xs">
                                    <Group justify="space-between">
                                        <Text fw={500} tt="capitalize">{dayjs(menu.date).locale('fr').format('dddd D MMMM')}</Text>
                                        <Group gap="xs">
                                            <Badge variant="light">{menu.items.length} plats</Badge>
                                            <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(menu)}>
                                                <IconPencil size="1rem" />
                                            </ActionIcon>
                                            <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(menu.id)}>
                                                <IconTrash size="1rem" />
                                            </ActionIcon>
                                        </Group>
                                    </Group>
                                </Card.Section>
                                <Stack mt="sm" gap="md">
                                    {menu.items.map(item => (
                                        <Box key={item.id}>
                                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                <Text size="sm" fw={500} style={{ lineHeight: 1.2 }}>{item.name}</Text>
                                                <Text size="sm" fw={600}>{item.price}€</Text>
                                            </Group>

                                            {item.description && (
                                                <Text size="xs" c="dimmed" fs="italic" mt={2} lineClamp={2}>
                                                    {item.description}
                                                </Text>
                                            )}

                                            {item.ingredients && (
                                                <Text size="xs" c="dimmed" mt={1}>
                                                    <Text span fw={500}>Ingrédients:</Text> {item.ingredients}
                                                </Text>
                                            )}

                                            {item.dietaryOptions.length > 0 && (
                                                <Group gap={4} mt={4}>
                                                    {item.dietaryOptions.map(opt => {
                                                        const label = DIETARY_OPTIONS.find(d => d.value === opt)?.label;
                                                        return (
                                                            <Tooltip key={opt} label={label}>
                                                                <Badge size="xs" variant="dot" color="gray" style={{ cursor: 'help' }}>
                                                                    {label?.substring(0, 3)}
                                                                </Badge>
                                                            </Tooltip>
                                                        );
                                                    })}
                                                </Group>
                                            )}
                                        </Box>
                                    ))}
                                </Stack>
                            </Card>
                        </Grid.Col>
                    ))}
                </Grid>
            )}

            <Modal opened={opened} onClose={handleClose} title={editingId ? "Modifier le menu" : "Créer un nouveau menu"} size="lg">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        <DatePickerInput
                            label="Date du menu"
                            placeholder="Choisir une date"
                            {...form.getInputProps('date')}
                        />

                        <Text fw={500} mt="md">Plats du jour</Text>

                        {form.values.items.map((item, index) => (
                            <Card key={index} withBorder shadow="sm" radius="md">
                                <Stack gap="xs">
                                    <Group align="flex-start" wrap="nowrap">
                                        <Stack gap="xs" style={{ flex: 1 }}>
                                            <Group grow>
                                                <TextInput
                                                    label="Nom du plat"
                                                    placeholder="Ex: Steak Frites"
                                                    {...form.getInputProps(`items.${index}.name`)}
                                                />
                                                <Select
                                                    label="Catégorie"
                                                    data={CATEGORIES}
                                                    allowDeselect={false}
                                                    {...form.getInputProps(`items.${index}.category`)}
                                                />
                                            </Group>
                                            <TextInput
                                                label="Description"
                                                placeholder="Marketing (ex: Délicieux steak...)"
                                                {...form.getInputProps(`items.${index}.description`)}
                                            />
                                            <Textarea
                                                label="Ingrédients"
                                                placeholder="Liste des ingrédients (ex: Boeuf, sel, poivre...)"
                                                autosize
                                                minRows={2}
                                                {...form.getInputProps(`items.${index}.ingredients`)}
                                            />
                                            <Group grow>
                                                <NumberInput
                                                    label="Prix"
                                                    min={0}
                                                    decimalScale={2}
                                                    fixedDecimalScale
                                                    suffix=" €"
                                                    {...form.getInputProps(`items.${index}.price`)}
                                                />
                                                <MultiSelect
                                                    label="Options alimentaires"
                                                    data={DIETARY_OPTIONS}
                                                    placeholder="Sélectionner..."
                                                    hidePickedOptions
                                                    {...form.getInputProps(`items.${index}.dietaryOptions`)}
                                                />
                                            </Group>
                                        </Stack>
                                        <ActionIcon color="red" variant="subtle" mt={25} onClick={() => removeItem(index)}>
                                            <IconTrash size="1rem" />
                                        </ActionIcon>
                                    </Group>
                                </Stack>
                            </Card>
                        ))}

                        <Button variant="outline" onClick={addItem} leftSection={<IconPlus size={14} />}>
                            Ajouter un élément
                        </Button>

                        <Group justify="flex-end" mt="xl">
                            <Button variant="default" onClick={handleClose}>Annuler</Button>
                            <Button type="submit" loading={loading}>{editingId ? "Enregistrer" : "Créer le menu"}</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal >
        </Container >
    );
}
