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
    Textarea,
    Switch,
    Divider,
    Collapse,
    UnstyledButton
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTrash, IconPencil, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createMenuAction, updateMenuAction, deleteMenuAction, MenuItemInput, OptionGroupInput, OptionItemInput } from './actions';
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
        spiceLevel?: string | null; // Added spiceLevel
        optionGroups: {
            id: string;
            name: string;
            isRequired: boolean;
            allowMultiple: boolean;
            maxOptions: number | null;
            options: {
                id: string;
                name: string;
                description: string | null; // Added description to option item
                price: number;
            }[];
        }[];
    }[];
};

// Extend MenuItemInput for UI-specific fields
type MenuItemInputWithUIHelpers = MenuItemInput & {
    _proteinPrice: number;
    _hasProtein: boolean;
    _dietaryConfigs: Record<string, { price: number; description: string }>;
    spiceLevel: string | null; // Add spiceLevel to form values
};

export default function MenusClient({ menus }: { menus: MenuWithItems[] }) {
    const [opened, { open, close }] = useDisclosure(false);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const form = useForm({
        initialValues: {
            date: new Date(),
            items: [
                {
                    name: '',
                    description: '',
                    ingredients: '',
                    price: 0,
                    category: 'MAIN',
                    dietaryOptions: [],
                    optionGroups: [], // Will be derived
                    spiceLevel: null, // Default spice level
                    _proteinPrice: 0,
                    _hasProtein: false,
                    _dietaryConfigs: {},
                } as unknown as MenuItemInputWithUIHelpers
            ] as MenuItemInputWithUIHelpers[],
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
            items: menu.items.map(item => {
                let hasProtein = false;
                let proteinPrice = 0;
                const dietaryConfigs: Record<string, { price: number, description: string }> = {};

                // Parse Protein Option Group
                const proteinGroup = item.optionGroups.find(g => g.name === "Supplément Protéines");
                if (proteinGroup && proteinGroup.options.length > 0) {
                    hasProtein = true;
                    proteinPrice = proteinGroup.options[0].price;
                }

                // Parse Dietary Option Groups
                // Groups are stored as "Variantes / Régimes" (for veg/vegan/halal) and "Option Sans Gluten"
                const variantGroup = item.optionGroups.find(g => g.name === "Variantes / Régimes");
                const glutenGroup = item.optionGroups.find(g => g.name === "Option Sans Gluten");

                item.dietaryOptions.forEach(tag => {
                    if (tag === 'SPICY') return; // handled by spiceLevel

                    if (tag === 'GLUTEN_FREE') {
                        if (glutenGroup && glutenGroup.options.length > 0) {
                            dietaryConfigs[tag] = {
                                price: glutenGroup.options[0].price,
                                description: glutenGroup.options[0].description || ''
                            };
                        } else {
                            dietaryConfigs[tag] = { price: 0, description: '' };
                        }
                    } else {
                        // Look for the matching option in the Variantes group
                        const DIETARY_LABELS_MAP: Record<string, string> = {
                            'VEGETARIAN': 'Végétarienne',
                            'VEGAN': 'Végan',
                            'HALAL': 'Halal',
                        };
                        const optionName = `Version ${DIETARY_LABELS_MAP[tag] || tag}`;
                        const matchingOption = variantGroup?.options.find(o => o.name === optionName);
                        dietaryConfigs[tag] = {
                            price: matchingOption?.price ?? 0,
                            description: matchingOption?.description || ''
                        };
                    }
                });

                return {
                    id: item.id,
                    name: item.name,
                    description: item.description || '',
                    ingredients: item.ingredients || '',
                    price: item.price,
                    category: item.category as any,
                    dietaryOptions: item.dietaryOptions as any,
                    spiceLevel: (item.spiceLevel || null),
                    optionGroups: [], // We rebuild this on submit
                    _proteinPrice: proteinPrice,
                    _hasProtein: hasProtein,
                    _dietaryConfigs: dietaryConfigs
                } as unknown as MenuItemInputWithUIHelpers;
            }),
        });
        open();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce menu ?')) return;
        setLoading(true);
        try {
            const res = await deleteMenuAction(id);
            if (res.success) {
                notifications.show({ title: 'Menu supprimé', color: 'green', message: '' });
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch (e) {
            notifications.show({ title: 'Erreur', message: 'Impossible de supprimer le menu', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        try {
            const processedItems: MenuItemInput[] = values.items.map(item => {
                const DIETARY_LABELS_MAP: Record<string, string> = {
                    'VEGETARIAN': 'Végétarienne',
                    'VEGAN': 'Végan',
                    'HALAL': 'Halal',
                    'GLUTEN_FREE': 'Sans Gluten'
                };

                // Prepare separate containers to enforce specific display order
                // Order: 1. Variants, 2. Protein, 3. Spices, 4. Gluten Free
                const optionGroups: OptionGroupInput[] = []; // Final array to be built
                const variantsOptions: OptionItemInput[] = [];

                let proteinGroup: OptionGroupInput | null = null;
                let spiceGroup: OptionGroupInput | null = null;
                let glutenFreeGroup: OptionGroupInput | null = null;

                // 1. Protein
                if (item._hasProtein) {
                    proteinGroup = {
                        name: "Supplément Protéines",
                        isRequired: false,
                        allowMultiple: false,
                        maxOptions: 1,
                        options: [{
                            name: "Extra Protéines",
                            price: item._proteinPrice,
                            description: undefined
                        }]
                    };
                }

                // 2. Process Tags
                item.dietaryOptions.forEach(tag => {
                    if (tag === 'SPICY') {
                        spiceGroup = {
                            name: "Niveau d'épice",
                            isRequired: true,
                            allowMultiple: false,
                            maxOptions: 1,
                            options: [
                                { name: "Doux", price: 0, description: undefined },
                                { name: "Épicé", price: 0, description: undefined },
                                { name: "Très Épicé", price: 0, description: undefined }
                            ]
                        };
                        return;
                    }

                    const config = item._dietaryConfigs[tag];
                    // Always create an option group for the tag if it's selected
                    // (even if price=0 and description empty — the option must exist to be selectable)
                    const optionPrice = config ? Number(config.price) || 0 : 0;
                    const optionDesc = config?.description?.trim() || undefined;

                    if (tag === 'GLUTEN_FREE') {
                        glutenFreeGroup = {
                            name: "Option Sans Gluten",
                            isRequired: false,
                            allowMultiple: false,
                            maxOptions: 1,
                            options: [{
                                name: "Version Sans Gluten",
                                price: optionPrice,
                                description: optionDesc
                            }]
                        };
                    } else {
                        variantsOptions.push({
                            name: `Version ${DIETARY_LABELS_MAP[tag] || tag}`,
                            price: optionPrice,
                            description: optionDesc
                        });
                    }
                });

                // Assemble in specific order
                if (variantsOptions.length > 0) {
                    optionGroups.push({
                        name: "Variantes / Régimes",
                        isRequired: false,
                        allowMultiple: false,
                        maxOptions: 1,
                        options: variantsOptions
                    });
                }

                if (proteinGroup) optionGroups.push(proteinGroup);
                if (spiceGroup) optionGroups.push(spiceGroup);
                if (glutenFreeGroup) optionGroups.push(glutenFreeGroup);

                return {
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    ingredients: item.ingredients,
                    price: item.price,
                    category: item.category,
                    dietaryOptions: item.dietaryOptions,
                    spiceLevel: undefined,
                    optionGroups: optionGroups
                };
            });

            let result;
            if (editingId) {
                result = await updateMenuAction(editingId, values.date, processedItems);
            } else {
                result = await createMenuAction(values.date, processedItems);
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
            setLoading(false);
        }
    };

    const addItem = () => {
        form.insertListItem('items', {
            name: '', description: '', ingredients: '', price: 0, category: 'MAIN', dietaryOptions: [], optionGroups: [],
            spiceLevel: null, _proteinPrice: 0, _hasProtein: false, _dietaryConfigs: {}
        } as unknown as MenuItemInputWithUIHelpers);
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

                                            {/* Detailed Options Display */}
                                            <Group gap={4} mt="xs" wrap="wrap">
                                                {/* Dietary Tags */}
                                                {item.dietaryOptions.map(tag => {
                                                    const label = DIETARY_OPTIONS.find(o => o.value === tag)?.label || tag;
                                                    let color = 'gray';
                                                    if (tag === 'SPICY') color = 'red';
                                                    else if (tag === 'VEGETARIAN' || tag === 'VEGAN') color = 'green';
                                                    else if (tag === 'GLUTEN_FREE') color = 'yellow';
                                                    else if (tag === 'HALAL') color = 'grape';

                                                    return (
                                                        <Badge key={tag} size="xs" variant="outline" color={color}>
                                                            {label}
                                                        </Badge>
                                                    );
                                                })}

                                                {/* Protein Check */}
                                                {item.optionGroups.some(g => g.name.includes('Protéines')) && (
                                                    <Badge size="xs" variant="outline" color="blue">+ Supplément Protéines</Badge>
                                                )}
                                            </Group>
                                        </Box>
                                    ))}
                                </Stack>
                            </Card>
                        </Grid.Col>
                    ))}
                </Grid>
            )}

            <Modal opened={opened} onClose={handleClose} title={editingId ? "Modifier le menu" : "Créer un nouveau menu"} size="xl">
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
                                                placeholder="Liste des ingrédients"
                                                autosize
                                                minRows={2}
                                                {...form.getInputProps(`items.${index}.ingredients`)}
                                            />
                                            <NumberInput
                                                label="Prix"
                                                min={0}
                                                decimalScale={2}
                                                fixedDecimalScale
                                                suffix=" €"
                                                {...form.getInputProps(`items.${index}.price`)}
                                            />

                                            <Divider label="Options & Régimes" labelPosition="center" my="sm" />

                                            {/* 1. Global Tags Select */}
                                            <MultiSelect
                                                label="Tags (Régimes & Info)"
                                                description="Sélectionnez les tags applicables. Configurez les détails ci-dessous."
                                                data={DIETARY_OPTIONS}
                                                placeholder="Sélectionner..."
                                                hidePickedOptions
                                                value={form.values.items[index].dietaryOptions as string[]}
                                                onChange={(newTags) => {
                                                    form.setFieldValue(`items.${index}.dietaryOptions`, newTags as any);
                                                    // Initialize _dietaryConfigs for newly added tags
                                                    // Without this, _dietaryConfigs[tag] is undefined and Mantine
                                                    // can't write price/description into a non-existent nested object
                                                    const currentConfigs = form.values.items[index]._dietaryConfigs || {};
                                                    const updatedConfigs = { ...currentConfigs };
                                                    newTags.forEach(tag => {
                                                        if (!updatedConfigs[tag]) {
                                                            updatedConfigs[tag] = { price: 0, description: '' };
                                                        }
                                                    });
                                                    form.setFieldValue(`items.${index}._dietaryConfigs`, updatedConfigs);
                                                }}
                                            />

                                            {/* 2. Protein Checkbox */}
                                            <Group mt="xs">
                                                <Switch
                                                    label="Proposer supplément Protéines ?"
                                                    {...form.getInputProps(`items.${index}._hasProtein`, { type: 'checkbox' })}
                                                />
                                                {form.values.items[index]._hasProtein && (
                                                    <NumberInput
                                                        placeholder="Prix supp."
                                                        size="xs"
                                                        w={100}
                                                        min={0}
                                                        decimalScale={2}
                                                        fixedDecimalScale
                                                        suffix=" €"
                                                        {...form.getInputProps(`items.${index}._proteinPrice`)}
                                                    />
                                                )}
                                            </Group>

                                            {/* 3. Dynamic Configurations for Selected Tags */}
                                            {form.values.items[index].dietaryOptions.length > 0 && (
                                                <Stack mt="md" gap="xs">
                                                    <Text size="sm" fw={500}>Configuration des Tags :</Text>

                                                    {form.values.items[index].dietaryOptions.map((tag) => {
                                                        if (tag === 'SPICY') {
                                                            return (
                                                                <Card key={tag} withBorder p="xs" bg="gray.0">
                                                                    <Group>
                                                                        <Badge color="red">Épicé</Badge>
                                                                        <Text size="sm" c="dimmed">
                                                                            Le client choisira son niveau (Doux, Épicé, Très Épicé)
                                                                        </Text>
                                                                    </Group>
                                                                </Card>
                                                            );
                                                        }

                                                        // For Diets (Veg, Vegan, etc.)
                                                        return (
                                                            <Card key={tag} withBorder p="xs" bg="gray.0">
                                                                <Group align="flex-start" grow>
                                                                    <Badge color="green" mt={4}>{DIETARY_OPTIONS.find(opt => opt.value === tag)?.label || tag}</Badge>
                                                                    <NumberInput
                                                                        label="Prix (Option)"
                                                                        size="xs"
                                                                        min={0}
                                                                        decimalScale={2}
                                                                        fixedDecimalScale
                                                                        suffix=" €"
                                                                        {...form.getInputProps(`items.${index}._dietaryConfigs.${tag}.price`)}
                                                                    />
                                                                    <TextInput
                                                                        label="Description (pour ce régime)"
                                                                        placeholder="Ex: Tofu à la place du poulet"
                                                                        size="xs"
                                                                        style={{ flex: 1 }}
                                                                        {...form.getInputProps(`items.${index}._dietaryConfigs.${tag}.description`)}
                                                                    />
                                                                </Group>
                                                            </Card>
                                                        );
                                                    })}
                                                </Stack>
                                            )}
                                        </Stack>
                                        <ActionIcon color="red" variant="subtle" mt={25} onClick={() => removeItem(index)}>
                                            <IconTrash size="1rem" />
                                        </ActionIcon>
                                    </Group>
                                </Stack>
                            </Card>
                        ))}

                        <Button variant="outline" onClick={addItem} leftSection={<IconPlus size={14} />}>
                            Ajouter un plat
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
