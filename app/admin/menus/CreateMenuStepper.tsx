'use client';

import {
    Modal,
    Stepper,
    Button,
    Group,
    Stack,
    Text,
    Card,
    Badge,
    Select,
    Box,
    Alert,
    ThemeIcon,
    NumberInput,
    Switch,
    TextInput,
    Divider,
    SimpleGrid,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
    IconChevronRight, IconCheck, IconAlertCircle, IconPlus,
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { getDishLibraryAction, createMenuAction, MenuItemInput, OptionGroupInput } from './actions';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
    { value: 'STARTER', label: 'Entrée', categoryId: 'STARTER' },
    { value: 'MAIN', label: 'Plat', categoryId: 'MAIN' },
    { value: 'DESSERT', label: 'Dessert', categoryId: 'DESSERT' },
    { value: 'DRINK', label: 'Boisson', categoryId: 'DRINK' },
];

const DIETARY_OPTIONS = [
    { value: 'VEGETARIAN', label: 'Végétarien', color: 'green' },
    { value: 'VEGAN', label: 'Vegan', color: 'teal' },
    { value: 'HALAL', label: 'Halal', color: 'grape' },
    { value: 'GLUTEN_FREE', label: 'Sans Gluten', color: 'yellow' },
    { value: 'SPICY', label: 'Épicé', color: 'red' },
    { value: 'PROTEIN', label: 'Supplément Protéines', color: 'blue' },
    { value: 'COMPLETE', label: 'Version Complète', color: 'orange' },
];

const SPICE_PRESETS = [
    { value: '2', label: 'Doux — Pimenté', options: ['Doux', 'Pimenté'] },
    { value: '3', label: 'Doux — Pimenté — Très pimenté', options: ['Doux', 'Pimenté', 'Très pimenté'] },
    { value: '4', label: 'Doux — Un peu pimenté — Pimenté — Très pimenté', options: ['Doux', 'Un peu pimenté', 'Pimenté', 'Très pimenté'] },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type DishOption = {
    id: string;
    name: string;
    category: string;
    description: string | null;
    suggestedPrice: number;
    imageUrl: string | null;
    dietaryOptions: string[];
    spiceLevel: string | null;
    optionGroups: Array<any>;
};

type TagConfig = {
    active: boolean;
    preset: string;      // SPICY only: which SPICE_PRESETS value
    price: number;       // non-SPICY: extra cost for this option
    description: string; // non-SPICY: option label (e.g. "Riz complet", "Tofu")
};

type DishConfig = {
    price: number;
    tagConfigs: Record<string, TagConfig>;
};

type SelectedDishEntry = { dish: DishOption; config: DishConfig };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultTagConfig(tag: string): TagConfig {
    return { active: true, preset: '3', price: 0, description: '' };
}

function getDefaultConfig(dish: DishOption): DishConfig {
    const tagConfigs: Record<string, TagConfig> = {};
    for (const tag of dish.dietaryOptions) {
        tagConfigs[tag] = getDefaultTagConfig(tag);
    }
    return { price: dish.suggestedPrice, tagConfigs };
}

// ─── DishConfigPanel ──────────────────────────────────────────────────────────

function DishConfigPanel({
    entry,
    onConfigChange,
}: {
    entry: SelectedDishEntry;
    onConfigChange: (config: DishConfig) => void;
}) {
    const { dish, config } = entry;

    const updateTag = (tag: string, patch: Partial<TagConfig>) => {
        const current = config.tagConfigs[tag] ?? getDefaultTagConfig(tag);
        onConfigChange({
            ...config,
            tagConfigs: { ...config.tagConfigs, [tag]: { ...current, ...patch } },
        });
    };

    return (
        <Stack gap="sm" pt="xs" onClick={(e) => e.stopPropagation()}>
            <Divider />

            {/* Price override */}
            <Group gap="sm" align="flex-end">
                <NumberInput
                    label="Prix pour ce menu"
                    value={config.price}
                    onChange={(v) => onConfigChange({ ...config, price: Number(v) || 0 })}
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    suffix=" €"
                    size="xs"
                    style={{ width: 130 }}
                />
                {config.price !== dish.suggestedPrice && (
                    <Button
                        size="xs"
                        variant="subtle"
                        color="gray"
                        onClick={() => onConfigChange({ ...config, price: dish.suggestedPrice })}
                    >
                        Suggéré : {dish.suggestedPrice.toFixed(2)}€
                    </Button>
                )}
            </Group>

            {/* Tag configurations */}
            {dish.dietaryOptions.length > 0 && (
                <Stack gap="xs">
                    <Text size="xs" fw={600} c="dimmed">Options pour ce menu :</Text>

                    {dish.dietaryOptions.map(tag => {
                        const tc = config.tagConfigs[tag] ?? getDefaultTagConfig(tag);
                        const tagMeta = DIETARY_OPTIONS.find(o => o.value === tag);

                        if (tag === 'SPICY') {
                            return (
                                <Card key={tag} withBorder p="xs" bg="gray.0">
                                    <Group align="flex-end" gap="xs">
                                        <Switch
                                            size="sm"
                                            checked={tc.active}
                                            onChange={(e) => updateTag(tag, { active: e.currentTarget.checked })}
                                        />
                                        <Badge color="red" mt={4}>Épicé</Badge>
                                        {tc.active && (
                                            <Select
                                                label="Niveaux proposés"
                                                size="xs"
                                                data={SPICE_PRESETS.map(p => ({ value: p.value, label: p.label }))}
                                                value={tc.preset}
                                                onChange={(v) => updateTag(tag, { preset: v || '3' })}
                                                style={{ flex: 1 }}
                                            />
                                        )}
                                    </Group>
                                </Card>
                            );
                        }

                        return (
                            <Card key={tag} withBorder p="xs" bg="gray.0">
                                <Group align="flex-start" gap="xs" wrap="nowrap">
                                    <Switch
                                        size="sm"
                                        checked={tc.active}
                                        onChange={(e) => updateTag(tag, { active: e.currentTarget.checked })}
                                        mt={4}
                                    />
                                    {tc.active ? (
                                        <SimpleGrid cols={{ base: 1, sm: 3 }} style={{ flex: 1, alignItems: 'flex-start' }}>
                                            <Badge color={tagMeta?.color || 'gray'} mt={4}>
                                                {tagMeta?.label || tag}
                                            </Badge>
                                            <NumberInput
                                                label="Prix (option)"
                                                size="xs"
                                                min={0}
                                                decimalScale={2}
                                                fixedDecimalScale
                                                suffix=" €"
                                                value={tc.price}
                                                onChange={(v) => updateTag(tag, { price: Number(v) || 0 })}
                                            />
                                            <TextInput
                                                label="Intitulé"
                                                placeholder={
                                                    tag === 'COMPLETE' ? 'Ex: Riz complet' :
                                                    tag === 'PROTEIN' ? 'Ex: Extra poulet' :
                                                    'Ex: Tofu à la place du poulet'
                                                }
                                                size="xs"
                                                value={tc.description}
                                                onChange={(e) => updateTag(tag, { description: e.currentTarget.value })}
                                            />
                                        </SimpleGrid>
                                    ) : (
                                        <Badge color={tagMeta?.color || 'gray'} variant="outline" mt={4}>
                                            {tagMeta?.label || tag}
                                        </Badge>
                                    )}
                                </Group>
                            </Card>
                        );
                    })}
                </Stack>
            )}
        </Stack>
    );
}

// ─── CreateMenuStepper ────────────────────────────────────────────────────────

export function CreateMenuStepper({
    opened,
    onClose,
    zones,
    onSuccess,
}: {
    opened: boolean;
    onClose: () => void;
    zones: Array<{ id: string; name: string; color: string }>;
    onSuccess?: () => void;
}) {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [dishesLoading, setDishesLoading] = useState(true);
    const [dishes, setDishes] = useState<DishOption[]>([]);

    const [selectedDishes, setSelectedDishes] = useState<Record<string, SelectedDishEntry[]>>({
        STARTER: [],
        MAIN: [],
        DESSERT: [],
        DRINK: [],
    });

    const [date, setDate] = useState<Date | null>(new Date());
    const [deliveryZoneId, setDeliveryZoneId] = useState<string>('');

    useEffect(() => {
        if (opened && dishes.length === 0) {
            loadDishes();
        }
    }, [opened, dishes.length]);

    const loadDishes = async () => {
        setDishesLoading(true);
        try {
            const res = await getDishLibraryAction();
            if (res.success && res.dishes) setDishes(res.dishes);
        } catch {
            notifications.show({ title: 'Erreur', message: 'Impossible de charger la bibliothèque', color: 'red' });
        } finally {
            setDishesLoading(false);
        }
    };

    const getDishesForCategory = (category: string) => dishes.filter(d => d.category === category);

    const handleSelectDish = (category: string, dish: DishOption) => {
        setSelectedDishes(prev => {
            const current = prev[category] || [];
            const isSelected = current.some(e => e.dish.id === dish.id);
            if (isSelected) {
                return { ...prev, [category]: current.filter(e => e.dish.id !== dish.id) };
            } else {
                return { ...prev, [category]: [...current, { dish, config: getDefaultConfig(dish) }] };
            }
        });
    };

    const handleConfigChange = (category: string, dishId: string, config: DishConfig) => {
        setSelectedDishes(prev => ({
            ...prev,
            [category]: prev[category].map(e => e.dish.id === dishId ? { ...e, config } : e),
        }));
    };

    const handleSubmit = async () => {
        if (!date) {
            notifications.show({ title: 'Erreur', message: 'Veuillez sélectionner une date', color: 'red' });
            return;
        }

        const items: MenuItemInput[] = [];

        Object.entries(selectedDishes).forEach(([category, entries]) => {
            entries.forEach(({ dish, config }) => {
                const optionGroups: OptionGroupInput[] = [];

                for (const tag of dish.dietaryOptions) {
                    const tc = config.tagConfigs[tag] ?? getDefaultTagConfig(tag);
                    if (!tc.active) continue;

                    if (tag === 'SPICY') {
                        const preset = SPICE_PRESETS.find(p => p.value === tc.preset) ?? SPICE_PRESETS[1];
                        optionGroups.push({
                            name: "Niveau d'épice",
                            isRequired: true,
                            allowMultiple: false,
                            maxOptions: 1,
                            options: preset.options.map(name => ({ name, price: 0 })),
                        });
                    } else if (tag === 'PROTEIN') {
                        optionGroups.push({
                            name: 'Supplément Protéines',
                            isRequired: false,
                            allowMultiple: false,
                            maxOptions: 1,
                            options: [{ name: tc.description.trim() || 'Extra Protéines', price: tc.price }],
                        });
                    } else if (tag === 'COMPLETE') {
                        optionGroups.push({
                            name: 'Version Complète',
                            isRequired: false,
                            allowMultiple: false,
                            maxOptions: 1,
                            options: [{ name: tc.description.trim() || 'Version Complète', price: tc.price }],
                        });
                    } else if (tag === 'GLUTEN_FREE') {
                        optionGroups.push({
                            name: 'Option Sans Gluten',
                            isRequired: false,
                            allowMultiple: false,
                            maxOptions: 1,
                            options: [{ name: tc.description.trim() || 'Version Sans Gluten', price: tc.price }],
                        });
                    } else {
                        // VEGETARIAN, VEGAN, HALAL
                        const label = DIETARY_OPTIONS.find(o => o.value === tag)?.label || tag;
                        optionGroups.push({
                            name: `Option ${label}`,
                            isRequired: false,
                            allowMultiple: false,
                            maxOptions: 1,
                            options: [{ name: tc.description.trim() || `Version ${label}`, price: tc.price }],
                        });
                    }
                }

                const activeDietaryOptions = dish.dietaryOptions.filter(
                    tag => config.tagConfigs[tag]?.active !== false
                );

                items.push({
                    name: dish.name,
                    description: dish.description || '',
                    ingredients: '',
                    price: config.price,
                    category: category as any,
                    dietaryOptions: activeDietaryOptions as any,
                    spiceLevel: dish.spiceLevel || undefined,
                    optionGroups,
                });
            });
        });

        if (items.length === 0) {
            notifications.show({ title: 'Erreur', message: 'Veuillez sélectionner au moins un plat', color: 'red' });
            return;
        }

        setLoading(true);
        try {
            const result = await createMenuAction(date, items, deliveryZoneId || null);
            if (result.success) {
                notifications.show({ title: 'Succès', message: 'Menu créé avec succès', color: 'green' });
                handleClose();
                onSuccess?.();
            } else {
                notifications.show({ title: 'Erreur', message: result.error || 'Impossible de créer le menu', color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Une erreur inconnue est survenue', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(0);
        setSelectedDishes({ STARTER: [], MAIN: [], DESSERT: [], DRINK: [] });
        setDate(new Date());
        setDeliveryZoneId('');
        onClose();
    };

    const currentCategory = CATEGORIES[step];
    const categoryDishes = currentCategory ? getDishesForCategory(currentCategory.categoryId) : [];
    const selectedDishList = currentCategory ? selectedDishes[currentCategory.categoryId] : [];
    const isStepsFilled = Object.values(selectedDishes).some(arr => arr.length > 0);

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title="Créer un menu"
            size="xl"
            centered
        >
            {/* ── Zone scrollable ── */}
            <div style={{ height: '65vh', overflowY: 'auto', paddingRight: 4 }}>
                <Stack gap="md">
                    <Stepper active={step} onStepClick={setStep}>
                            {/* Steps 0–3: Category selection */}
                            {CATEGORIES.map((cat) => (
                                <Stepper.Step
                                    key={cat.categoryId}
                                    label={cat.label}
                                    description={
                                        selectedDishes[cat.categoryId].length > 0
                                            ? `${selectedDishes[cat.categoryId].length} plat(s)`
                                            : undefined
                                    }
                                    completedIcon={
                                        selectedDishes[cat.categoryId].length > 0
                                            ? <IconCheck size={16} />
                                            : undefined
                                    }
                                >
                                    <Stack gap="md">
                                        {dishesLoading ? (
                                            <Text c="dimmed" ta="center">Chargement...</Text>
                                        ) : categoryDishes.length === 0 ? (
                                            <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="Aucun plat">
                                                Aucun plat dans cette catégorie
                                            </Alert>
                                        ) : (
                                            <Stack gap="sm">
                                                <Group justify="space-between">
                                                    <Text fw={500}>Sélectionner {cat.label}</Text>
                                                    {selectedDishList.length > 0 && (
                                                        <Button
                                                            size="xs"
                                                            variant="light"
                                                            color="red"
                                                            onClick={() => setSelectedDishes(prev => ({ ...prev, [cat.categoryId]: [] }))}
                                                        >
                                                            Retirer tout ({selectedDishList.length})
                                                        </Button>
                                                    )}
                                                </Group>

                                                {categoryDishes.map(dish => {
                                                    const selectedEntry = selectedDishList.find(e => e.dish.id === dish.id);
                                                    const isSelected = !!selectedEntry;

                                                    return (
                                                        <Card
                                                            key={dish.id}
                                                            withBorder
                                                            p="md"
                                                            style={{
                                                                backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : undefined,
                                                                borderColor: isSelected ? 'var(--mantine-color-blue-5)' : undefined,
                                                                borderWidth: isSelected ? 2 : 1,
                                                            }}
                                                        >
                                                            {/* Clickable header row */}
                                                            <Box
                                                                onClick={() => handleSelectDish(cat.categoryId, dish)}
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                                    <Stack gap="xs" style={{ flex: 1 }}>
                                                                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                                            <Text fw={500}>{dish.name}</Text>
                                                                            <Badge size="lg">{dish.suggestedPrice.toFixed(2)}€</Badge>
                                                                        </Group>
                                                                        {dish.description && (
                                                                            <Text size="sm" c="dimmed" lineClamp={2}>
                                                                                {dish.description}
                                                                            </Text>
                                                                        )}
                                                                        {dish.imageUrl && (
                                                                            <Box
                                                                                component="img"
                                                                                src={dish.imageUrl}
                                                                                alt={dish.name}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    height: 100,
                                                                                    objectFit: 'cover',
                                                                                    borderRadius: '4px',
                                                                                }}
                                                                            />
                                                                        )}
                                                                        {dish.dietaryOptions.length > 0 && (
                                                                            <Group gap={4} wrap="wrap">
                                                                                {dish.dietaryOptions.map(tag => {
                                                                                    const opt = DIETARY_OPTIONS.find(o => o.value === tag);
                                                                                    return (
                                                                                        <Badge key={tag} size="xs" variant="outline" color={opt?.color || 'gray'}>
                                                                                            {opt?.label || tag}
                                                                                        </Badge>
                                                                                    );
                                                                                })}
                                                                            </Group>
                                                                        )}
                                                                    </Stack>
                                                                    {isSelected && (
                                                                        <ThemeIcon color="blue" variant="light" size="lg" ml="xs">
                                                                            <IconCheck size={16} />
                                                                        </ThemeIcon>
                                                                    )}
                                                                </Group>
                                                            </Box>

                                                            {/* Config panel — expands when selected */}
                                                            {isSelected && selectedEntry && (
                                                                <DishConfigPanel
                                                                    entry={selectedEntry}
                                                                    onConfigChange={(cfg) =>
                                                                        handleConfigChange(cat.categoryId, dish.id, cfg)
                                                                    }
                                                                />
                                                            )}
                                                        </Card>
                                                    );
                                                })}
                                            </Stack>
                                        )}
                                    </Stack>
                                </Stepper.Step>
                            ))}

                            {/* Step 4: Summary, date & zone */}
                            <Stepper.Step label="Infos" description="Finaliser">
                                <Stack gap="md">
                                    <Alert icon={<IconAlertCircle size={16} />} color="blue">
                                        Vérifiez votre sélection avant de créer
                                    </Alert>

                                    <div>
                                        <Text fw={500} mb="sm">Plats sélectionnés :</Text>
                                        <Stack gap="xs">
                                            {CATEGORIES.map(cat => {
                                                const selected = selectedDishes[cat.categoryId];
                                                return (
                                                    <Box key={cat.categoryId}>
                                                        <Group justify="space-between" mb={selected.length > 0 ? 4 : 0}>
                                                            <Text size="sm">{cat.label}</Text>
                                                            {selected.length > 0 ? (
                                                                <Badge color="green" variant="light">{selected.length} plat(s)</Badge>
                                                            ) : (
                                                                <Text size="sm" c="dimmed">—</Text>
                                                            )}
                                                        </Group>
                                                        {selected.map(({ dish, config }) => {
                                                            const activeTags = dish.dietaryOptions.filter(
                                                                t => config.tagConfigs[t]?.active !== false
                                                            );
                                                            return (
                                                                <Group key={dish.id} gap="xs" pl="md" mb={2}>
                                                                    <Text size="xs" c="dimmed">• {dish.name}</Text>
                                                                    <Badge size="xs" variant="filled">{config.price.toFixed(2)}€</Badge>
                                                                    {activeTags.map(tag => {
                                                                        const opt = DIETARY_OPTIONS.find(o => o.value === tag);
                                                                        return (
                                                                            <Badge key={tag} size="xs" variant="outline" color={opt?.color || 'gray'}>
                                                                                {opt?.label || tag}
                                                                            </Badge>
                                                                        );
                                                                    })}
                                                                </Group>
                                                            );
                                                        })}
                                                    </Box>
                                                );
                                            })}
                                        </Stack>
                                    </div>

                                    <DatePickerInput
                                        label="Date du menu"
                                        placeholder="Choisir une date"
                                        value={date}
                                        onChange={(v) => setDate(v as Date | null)}
                                        minDate={new Date()}
                                        locale="fr"
                                        required
                                    />

                                    <Select
                                        label="Zone de livraison"
                                        description="Optionnel"
                                        placeholder="Aucune restriction"
                                        clearable
                                        data={zones.map(z => ({ value: z.id, label: z.name }))}
                                        value={deliveryZoneId}
                                        onChange={v => setDeliveryZoneId(v || '')}
                                    />
                                </Stack>
                            </Stepper.Step>
                    </Stepper>
                </Stack>
            </div>

            {/* ── Navigation buttons — toujours visibles ── */}
            <Divider mt="md" />
            <Group justify="space-between" pt="sm">
                <Button
                    variant="default"
                    onClick={() => {
                        if (step > 0) setStep(step - 1);
                        else handleClose();
                    }}
                >
                    {step === 0 ? 'Annuler' : 'Précédent'}
                </Button>

                <Group gap="xs">
                    {step < 4 && (
                        <Button onClick={() => setStep(step + 1)} rightSection={<IconChevronRight size={14} />}>
                            Suivant
                        </Button>
                    )}
                    {step === 4 && (
                        <Button
                            onClick={handleSubmit}
                            loading={loading}
                            disabled={!isStepsFilled || !date}
                            color="green"
                            leftSection={<IconPlus size={14} />}
                        >
                            Créer le menu
                        </Button>
                    )}
                </Group>
            </Group>
        </Modal>
    );
}
