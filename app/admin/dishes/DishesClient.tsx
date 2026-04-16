'use client';

import {
    Button, Container, Group, Title, Text, Modal, TextInput, NumberInput, Select,
    ActionIcon, Stack, Box, Card, Badge, Grid, MultiSelect, Textarea, Tooltip, Tabs,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash, IconPencil, IconCopy } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
    createDishLibraryItemAction, updateDishLibraryItemAction, deleteDishLibraryItemAction,
    DishLibraryItemInput,
} from './actions';
import { DietaryOption, ItemCategory } from '@prisma/client';
import { useState } from 'react';

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
    { value: 'PROTEIN', label: 'Supplément Protéines' },
    { value: 'COMPLETE', label: 'Version Complète' },
];

type DishWithOptions = {
    id: string;
    name: string;
    description: string | null;
    ingredients: string | null;
    imageUrl: string | null;
    category: ItemCategory;
    dietaryOptions: DietaryOption[];
    spiceLevel: string | null;
    suggestedPrice: number;
    createdAt: Date;
    updatedAt: Date;
    optionGroups: Array<{
        id: string;
        name: string;
        isRequired: boolean;
        allowMultiple: boolean;
        maxOptions: number | null;
        options: Array<{ id: string; name: string; description: string | null; price: number }>;
    }>;
};

function DishCard({
    dish,
    onEdit,
    onDelete,
    onDuplicate,
}: {
    dish: DishWithOptions;
    onEdit: (d: DishWithOptions) => void;
    onDelete: (id: string) => void;
    onDuplicate: (d: DishWithOptions) => void;
}) {
    return (
        <Card withBorder padding="lg" radius="md">
            <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between">
                    <Text fw={500}>{dish.name}</Text>
                    <Group gap="xs">
                        <Badge variant="light" color="blue">{dish.category}</Badge>
                        <Text fw={600}>{dish.suggestedPrice.toFixed(2)}€</Text>
                        <Tooltip label="Dupliquer">
                            <ActionIcon variant="subtle" color="grape" onClick={() => onDuplicate(dish)}>
                                <IconCopy size="1rem" />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Modifier">
                            <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(dish)}>
                                <IconPencil size="1rem" />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Supprimer">
                            <ActionIcon variant="subtle" color="red" onClick={() => onDelete(dish.id)}>
                                <IconTrash size="1rem" />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
            </Card.Section>
            <Stack mt="sm" gap="md">
                {dish.imageUrl && (
                    <Box
                        component="img"
                        src={dish.imageUrl}
                        alt={dish.name}
                        style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                )}
                {dish.description && (
                    <Text size="sm" c="dimmed">{dish.description}</Text>
                )}
                <Group gap={4} wrap="wrap">
                    {dish.dietaryOptions.map(tag => {
                        const label = DIETARY_OPTIONS.find(o => o.value === tag)?.label || tag;
                        let color = 'gray';
                        if (tag === 'SPICY') color = 'red';
                        else if (tag === 'VEGETARIAN' || tag === 'VEGAN') color = 'green';
                        else if (tag === 'GLUTEN_FREE') color = 'yellow';
                        return (
                            <Badge key={tag} size="xs" variant="outline" color={color}>
                                {label}
                            </Badge>
                        );
                    })}
                </Group>
            </Stack>
        </Card>
    );
}

export default function DishesClient({ dishes }: { dishes: DishWithOptions[] }) {
    const [opened, { open, close }] = useDisclosure(false);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [duplicating, setDuplicating] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'ALL'>('ALL');

    const form = useForm({
        initialValues: {
            name: '',
            description: '',
            ingredients: '',
            imageUrl: '',
            price: 0,
            category: 'MAIN' as ItemCategory,
            dietaryOptions: [] as DietaryOption[],
            spiceLevel: null as string | null,
        },
        validate: {
            name: (value) => (value.length < 2 ? 'Nom trop court' : null),
            price: (value) => (value < 0 ? 'Prix invalide' : null),
        },
    });

    const handleClose = () => {
        close();
        setEditingId(null);
        setDuplicating(false);
        form.reset();
    };

    const handleEdit = (dish: DishWithOptions) => {
        setEditingId(dish.id);
        setDuplicating(false);
        form.setValues({
            name: dish.name,
            description: dish.description || '',
            ingredients: dish.ingredients || '',
            imageUrl: dish.imageUrl || '',
            price: dish.suggestedPrice,
            category: dish.category,
            dietaryOptions: dish.dietaryOptions,
            spiceLevel: dish.spiceLevel || null,
        });
        open();
    };

    const handleDuplicate = (dish: DishWithOptions) => {
        setEditingId(null);
        setDuplicating(true);
        form.setValues({
            name: `${dish.name} (2)`,
            description: dish.description || '',
            ingredients: dish.ingredients || '',
            imageUrl: dish.imageUrl || '',
            price: dish.suggestedPrice,
            category: dish.category,
            dietaryOptions: dish.dietaryOptions,
            spiceLevel: dish.spiceLevel || null,
        });
        open();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce plat de la bibliothèque ?')) return;
        setLoading(true);
        try {
            const res = await deleteDishLibraryItemAction(id);
            if (res.success) {
                notifications.show({ title: 'Plat supprimé', color: 'green', message: '' });
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Impossible de supprimer', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        try {
            const input: DishLibraryItemInput = {
                id: editingId ?? undefined,
                name: values.name,
                description: values.description,
                ingredients: values.ingredients,
                imageUrl: values.imageUrl || undefined,
                price: values.price,
                category: values.category,
                dietaryOptions: values.dietaryOptions,
                spiceLevel: values.spiceLevel || undefined,
                optionGroups: [],
            };

            const res = editingId
                ? await updateDishLibraryItemAction(editingId, input)
                : await createDishLibraryItemAction(input);

            if (res.success) {
                notifications.show({
                    title: 'Succès',
                    message: duplicating ? 'Plat dupliqué' : (editingId ? 'Plat mis à jour' : 'Plat créé'),
                    color: 'green',
                });
                handleClose();
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Une erreur inconnue est survenue', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const filteredDishes = selectedCategory === 'ALL'
        ? dishes
        : dishes.filter(d => d.category === selectedCategory);

    return (
        <Container fluid>
            <Group justify="space-between" mb="lg">
                <Title order={2}>Bibliothèque de Plats</Title>
                <Button leftSection={<IconPlus size={14} />} onClick={open}>Nouveau Plat</Button>
            </Group>

            {dishes.length === 0 ? (
                <Text c="dimmed">Aucun plat pour le moment.</Text>
            ) : (
                <>
                    <Tabs value={selectedCategory} onChange={(val) => setSelectedCategory(val as any)} mb="lg">
                        <Tabs.List>
                            <Tabs.Tab value="ALL">Tous ({dishes.length})</Tabs.Tab>
                            <Tabs.Tab value="STARTER">Entrées ({dishes.filter(d => d.category === 'STARTER').length})</Tabs.Tab>
                            <Tabs.Tab value="MAIN">Plats ({dishes.filter(d => d.category === 'MAIN').length})</Tabs.Tab>
                            <Tabs.Tab value="DESSERT">Desserts ({dishes.filter(d => d.category === 'DESSERT').length})</Tabs.Tab>
                            <Tabs.Tab value="DRINK">Boissons ({dishes.filter(d => d.category === 'DRINK').length})</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>

                    {filteredDishes.length === 0 ? (
                        <Text c="dimmed">Aucun plat dans cette catégorie.</Text>
                    ) : (
                        <Grid>
                            {filteredDishes.map(dish => (
                                <Grid.Col key={dish.id} span={{ base: 12, md: 6, lg: 4 }}>
                                    <DishCard
                                        dish={dish}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        onDuplicate={handleDuplicate}
                                    />
                                </Grid.Col>
                            ))}
                        </Grid>
                    )}
                </>
            )}

            <Modal
                opened={opened}
                onClose={handleClose}
                title={duplicating ? "Dupliquer le plat" : (editingId ? "Modifier le plat" : "Ajouter à la bibliothèque")}
                size="lg"
            >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        <TextInput
                            label="Nom du plat"
                            placeholder="Ex: Steak Frites"
                            {...form.getInputProps('name')}
                        />

                        <Select
                            label="Catégorie"
                            data={CATEGORIES}
                            allowDeselect={false}
                            {...form.getInputProps('category')}
                        />

                        <TextInput
                            label="Description"
                            placeholder="Marketing"
                            {...form.getInputProps('description')}
                        />

                        <TextInput
                            label="URL de l'image"
                            placeholder="https://exemple.com/image.jpg"
                            {...form.getInputProps('imageUrl')}
                        />

                        <Textarea
                            label="Ingrédients"
                            placeholder="Liste"
                            autosize
                            minRows={2}
                            {...form.getInputProps('ingredients')}
                        />

                        <NumberInput
                            label="Prix suggéré"
                            min={0}
                            decimalScale={2}
                            fixedDecimalScale
                            suffix=" €"
                            {...form.getInputProps('price')}
                        />

                        <MultiSelect
                            label="Tags (Régimes & Info)"
                            description="Ces tags seront configurables à chaque création de menu"
                            data={DIETARY_OPTIONS}
                            placeholder="Sélectionner..."
                            hidePickedOptions
                            {...form.getInputProps('dietaryOptions')}
                        />

                        <Group justify="flex-end" mt="xl">
                            <Button variant="default" onClick={handleClose}>Annuler</Button>
                            <Button type="submit" loading={loading}>
                                {duplicating ? "Dupliquer le plat" : (editingId ? "Enregistrer" : "Ajouter à la bibliothèque")}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
}
