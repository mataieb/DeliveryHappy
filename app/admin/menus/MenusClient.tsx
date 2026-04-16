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
    Textarea,
    Divider,
    Tooltip,
    ThemeIcon,
    Alert,
    Accordion,
    ColorSwatch,
    SimpleGrid,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
    IconPlus, IconTrash, IconPencil, IconCopy,
    IconCalendarEvent, IconCalendarStats, IconAlertCircle, IconMailForward, IconCalendarWeek
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
    createMenuAction, updateMenuAction, deleteMenuAction, copyMenuAction,
    sendMenuNotificationAction, sendWeeklyMenuNotificationAction,
    getDishLibraryAction,
    MenuItemInput, OptionGroupInput,
} from './actions';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useState } from 'react';
import { CreateMenuStepper } from './CreateMenuStepper';

// ─── Constants ────────────────────────────────────────────────────────────────

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

const SPICE_PRESETS = [
    { value: '2', label: 'Doux — Pimenté', options: ['Doux', 'Pimenté'] },
    { value: '3', label: 'Doux — Pimenté — Très pimenté', options: ['Doux', 'Pimenté', 'Très pimenté'] },
    { value: '4', label: 'Doux — Un peu pimenté — Pimenté — Très pimenté', options: ['Doux', 'Un peu pimenté', 'Pimenté', 'Très pimenté'] },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ZoneOption = { id: string; name: string; color: string };

type MenuWithItems = {
    id: string;
    date: Date;
    deliveryZoneId: string | null;
    deliveryZone: ZoneOption | null;
    items: {
        id: string;
        name: string;
        description: string | null;
        ingredients: string | null;
        price: number;
        category: string;
        dietaryOptions: string[];
        spiceLevel?: string | null;
        optionGroups: {
            id: string;
            name: string;
            isRequired: boolean;
            allowMultiple: boolean;
            maxOptions: number | null;
            options: {
                id: string;
                name: string;
                description: string | null;
                price: number;
            }[];
        }[];
    }[];
};

type MenuItemInputWithUIHelpers = MenuItemInput & {
    _dietaryConfigs: Record<string, { price: number; description: string }>;
    _spicePreset: string;
    spiceLevel: string | null;
};

const EMPTY_ITEM: MenuItemInputWithUIHelpers = {
    name: '', description: '', ingredients: '', price: 0,
    category: 'MAIN' as any, dietaryOptions: [], optionGroups: [],
    spiceLevel: null, _dietaryConfigs: {}, _spicePreset: '3',
} as unknown as MenuItemInputWithUIHelpers;

// ─── Select Dish Modal ────────────────────────────────────────────────────────

function SelectDishModal({
    opened,
    onClose,
    dishes,
    onSelect,
    category,
}: {
    opened: boolean;
    onClose: () => void;
    dishes: Array<any>;
    onSelect: (dish: any) => void;
    category: 'STARTER' | 'MAIN' | 'DESSERT' | 'DRINK' | null;
}) {
    const filteredDishes = category ? dishes.filter(d => d.category === category) : [];
    const categoryLabel = category ? CATEGORIES.find(c => c.value === category)?.label : '';

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={`Ajouter ${categoryLabel}`}
            size="lg"
            radius="md"
        >
            <Stack gap="sm">
                {filteredDishes.length === 0 ? (
                    <Text c="dimmed">Aucun plat dans cette catégorie. Créez-en d'abord dans Bibliothèque.</Text>
                ) : (
                    filteredDishes.map(dish => (
                        <Card
                            key={dish.id}
                            withBorder
                            p="md"
                            radius="md"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                onSelect(dish);
                                onClose();
                            }}
                        >
                            <Group justify="space-between" align="flex-start">
                                <div style={{ flex: 1 }}>
                                    <Text fw={500}>{dish.name}</Text>
                                    {dish.description && (
                                        <Text size="sm" c="dimmed" mt={4}>{dish.description}</Text>
                                    )}
                                    {dish.imageUrl && (
                                        <Box
                                            component="img"
                                            src={dish.imageUrl}
                                            alt={dish.name}
                                            style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', marginTop: '8px' }}
                                        />
                                    )}
                                    <Group gap={4} mt="xs" wrap="wrap">
                                        {dish.dietaryOptions.map((tag: string) => {
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
                                </div>
                                <Group gap="xs" wrap="nowrap">
                                    <Text fw={600}>{dish.suggestedPrice.toFixed(2)}€</Text>
                                    <IconPlus size={16} />
                                </Group>
                            </Group>
                        </Card>
                    ))
                )}
            </Stack>
        </Modal>
    );
}

// ─── Copy Modal ───────────────────────────────────────────────────────────────

function CopyMenuModal({
    opened,
    onClose,
    sourceMenu,
}: {
    opened: boolean;
    onClose: () => void;
    sourceMenu: MenuWithItems | null;
}) {
    const [targetDate, setTargetDate] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);

    const handleCopy = async () => {
        if (!sourceMenu || !targetDate) return;
        setLoading(true);
        try {
            const res = await copyMenuAction(sourceMenu.id, targetDate);
            if (res.success) {
                notifications.show({
                    title: 'Menu copié !',
                    message: `Menu du ${dayjs(sourceMenu.date).locale('fr').format('D MMMM')} copié vers le ${dayjs(targetDate).locale('fr').format('D MMMM YYYY')}.`,
                    color: 'green',
                });
                setTargetDate(null);
                onClose();
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Une erreur inattendue est survenue.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={() => { setTargetDate(null); onClose(); }}
            title={
                <Group gap="xs">
                    <IconCopy size={18} />
                    <Text fw={700}>Dupliquer le menu</Text>
                </Group>
            }
            size="sm"
            radius="md"
        >
            {sourceMenu && (
                <Stack>
                    <Alert color="blue" variant="light" icon={<IconAlertCircle size={16} />}>
                        Copie du menu du{' '}
                        <strong>{dayjs(sourceMenu.date).locale('fr').format('dddd D MMMM YYYY')}</strong>
                        {' '}({sourceMenu.items.length} plat{sourceMenu.items.length > 1 ? 's' : ''}).
                        Les commandes existantes ne seront pas affectées.
                    </Alert>

                    <DatePickerInput
                        label="Nouvelle date"
                        placeholder="Choisir une date"
                        value={targetDate}
                        onChange={(v) => setTargetDate(v as Date | null)}
                        minDate={new Date()}
                        locale="fr"
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => { setTargetDate(null); onClose(); }}>
                            Annuler
                        </Button>
                        <Button
                            leftSection={<IconCopy size={14} />}
                            onClick={handleCopy}
                            loading={loading}
                            disabled={!targetDate}
                            color="teal"
                        >
                            Dupliquer
                        </Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
}

// ─── Menu Card ────────────────────────────────────────────────────────────────

function MenuCard({
    menu,
    isPast,
    onEdit,
    onDelete,
    onCopy,
}: {
    menu: MenuWithItems;
    isPast: boolean;
    onEdit: (m: MenuWithItems) => void;
    onDelete: (id: string) => void;
    onCopy: (m: MenuWithItems) => void;
}) {
    const [notifying, setNotifying] = useState(false);

    const handleNotify = async () => {
        if (!confirm(
            `Envoyer une notification par email à tous les utilisateurs pour le menu du ${dayjs(menu.date).locale('fr').format('D MMMM YYYY')} ?`
        )) return;
        setNotifying(true);
        try {
            const res = await sendMenuNotificationAction(menu.id);
            if (res.success) {
                const isTest = (res as any).testMode;
                notifications.show({
                    title: isTest ? '🧪 Email test envoyé' : '📧 Emails envoyés !',
                    message: isTest
                        ? `Email de test envoyé à ${(res as any).testRecipient}. Configurez RESEND_TEST_RECIPIENT='' et un domaine vérifié pour envoyer à tous les users.`
                        : `${(res as any).sent} utilisateur(s) notifié(s).`,
                    color: isTest ? 'yellow' : 'green',
                    autoClose: isTest ? 8000 : 4000,
                });
            } else {
                notifications.show({ title: 'Erreur', message: (res as any).error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'envoi.', color: 'red' });
        } finally {
            setNotifying(false);
        }
    };

    return (
        <Card
            withBorder
            padding="lg"
            radius="md"
            style={{
                opacity: isPast ? 0.75 : 1,
                borderColor: isPast ? 'var(--mantine-color-gray-3)' : undefined,
            }}
        >
            <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between">
                    <Group gap="xs">
                        {isPast && (
                            <ThemeIcon size="xs" color="gray" variant="light" radius="xl">
                                <IconCalendarStats size={10} />
                            </ThemeIcon>
                        )}
                        <Text
                            fw={500}
                            tt="capitalize"
                            c={isPast ? 'dimmed' : undefined}
                        >
                            {dayjs(menu.date).locale('fr').format('dddd D MMMM YYYY')}
                        </Text>
                    </Group>
                    <Group gap="xs">
                        {menu.deliveryZone && (
                            <Badge
                                variant="light"
                                color="teal"
                                size="sm"
                                leftSection={
                                    <ColorSwatch color={menu.deliveryZone.color} size={8} />
                                }
                            >
                                {menu.deliveryZone.name}
                            </Badge>
                        )}
                        <Badge variant="light" color={isPast ? 'gray' : 'blue'}>
                            {menu.items.length} plat{menu.items.length > 1 ? 's' : ''}
                        </Badge>
                        {!isPast && (
                            <Tooltip label="Notifier les utilisateurs par email" withArrow>
                                <ActionIcon
                                    variant="subtle"
                                    color="indigo"
                                    onClick={handleNotify}
                                    loading={notifying}
                                >
                                    <IconMailForward size="1rem" />
                                </ActionIcon>
                            </Tooltip>
                        )}
                        <Tooltip label="Dupliquer vers une autre date" withArrow>
                            <ActionIcon variant="subtle" color="teal" onClick={() => onCopy(menu)}>
                                <IconCopy size="1rem" />
                            </ActionIcon>
                        </Tooltip>
                        {!isPast && (
                            <Tooltip label="Modifier" withArrow>
                                <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(menu)}>
                                    <IconPencil size="1rem" />
                                </ActionIcon>
                            </Tooltip>
                        )}
                        {isPast && (
                            <Tooltip label="Modifier (menu passé)" withArrow>
                                <ActionIcon variant="subtle" color="gray" onClick={() => onEdit(menu)}>
                                    <IconPencil size="1rem" />
                                </ActionIcon>
                            </Tooltip>
                        )}
                        <Tooltip label="Supprimer" withArrow>
                            <ActionIcon variant="subtle" color="red" onClick={() => onDelete(menu.id)}>
                                <IconTrash size="1rem" />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
            </Card.Section>
            <Stack mt="sm" gap="md">
                {menu.items.map(item => (
                    <Box key={item.id}>
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                            <Text size="sm" fw={500} style={{ lineHeight: 1.2 }} c={isPast ? 'dimmed' : undefined}>
                                {item.name}
                            </Text>
                            <Text size="sm" fw={600} c={isPast ? 'dimmed' : undefined}>{item.price}€</Text>
                        </Group>

                        {item.description && (
                            <Text size="xs" c="dimmed" fs="italic" mt={2} lineClamp={2}>
                                {item.description}
                            </Text>
                        )}

                        <Group gap={4} mt="xs" wrap="wrap">
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
                            {item.optionGroups.some(g => g.name.includes('Protéines')) && (
                                <Badge size="xs" variant="outline" color="blue">+ Supplément Protéines</Badge>
                            )}
                        </Group>
                    </Box>
                ))}
            </Stack>
        </Card>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MenusClient({ menus, zones }: { menus: MenuWithItems[]; zones: ZoneOption[] }) {
    const isMobile = useMediaQuery('(max-width: 48em)');
    const [opened, { open, close }] = useDisclosure(false);
    const [stepperOpened, { open: openStepper, close: closeStepper }] = useDisclosure(false);
    const [loading, setLoading] = useState(false);
    const [weeklyNotifying, setWeeklyNotifying] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [copySource, setCopySource] = useState<MenuWithItems | null>(null);
    const [copyOpened, { open: openCopy, close: closeCopy }] = useDisclosure(false);
    const [dishLibrary, setDishLibrary] = useState<any[]>([]);
    const [dishLibraryLoading, setDishLibraryLoading] = useState(false);
    const [dishSelectCategory, setDishSelectCategory] = useState<'STARTER' | 'MAIN' | 'DESSERT' | 'DRINK' | null>(null);
    const [dishSelectOpened, { open: openDishSelect, close: closeDishSelect }] = useDisclosure(false);

    const handleWeeklyNotify = async (menuIds: string[]) => {
        if (!confirm('Envoyer le récapitulatif de cette semaine à tous les utilisateurs ?')) return;
        setWeeklyNotifying(true);
        try {
            const res = await sendWeeklyMenuNotificationAction(menuIds);
            if (res.success) {
                const isTest = (res as any).testMode;
                notifications.show({
                    title: isTest ? '🧪 Email test envoyé' : '📧 Récap semaine envoyé !',
                    message: isTest
                        ? `Email de test envoyé à ${(res as any).testRecipient}.`
                        : `${(res as any).sent} utilisateur(s) notifié(s).`,
                    color: isTest ? 'yellow' : 'green',
                    autoClose: isTest ? 8000 : 4000,
                });
            } else {
                notifications.show({ title: 'Erreur', message: (res as any).error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'envoi.', color: 'red' });
        } finally {
            setWeeklyNotifying(false);
        }
    };

    const handleOpenDishSelect = async (category: 'STARTER' | 'MAIN' | 'DESSERT' | 'DRINK') => {
        setDishSelectCategory(category);
        if (dishLibrary.length === 0 && !dishLibraryLoading) {
            setDishLibraryLoading(true);
            try {
                const res = await getDishLibraryAction();
                if (res.success) {
                    setDishLibrary(res.dishes);
                }
            } finally {
                setDishLibraryLoading(false);
            }
        }
        openDishSelect();
    };

    const handleSelectDish = (dish: any) => {
        const configs: Record<string, { price: number; description: string }> = {};
        for (const tag of (dish.dietaryOptions as string[])) {
            configs[tag] = { price: 0, description: '' };
        }
        const newItem: MenuItemInputWithUIHelpers = {
            id: undefined,
            name: dish.name,
            description: dish.description || '',
            ingredients: dish.ingredients || '',
            price: dish.suggestedPrice,
            category: dish.category as any,
            dietaryOptions: dish.dietaryOptions as any,
            spiceLevel: dish.spiceLevel || null,
            optionGroups: [],
            _dietaryConfigs: configs,
            _spicePreset: '3',
        };
        form.insertListItem('items', newItem);
    };

    // ─ Group menus by week (Monday = start) ─
    const today = dayjs().startOf('day');
    const currentWeekKey = today.startOf('week').add(1, 'day').format('YYYY-MM-DD');

    type WeekGroup = { weekKey: string; weekStart: ReturnType<typeof dayjs>; menus: MenuWithItems[] };
    const weekGroupMap: Record<string, WeekGroup> = {};
    for (const menu of menus) {
        const monday = dayjs(menu.date).startOf('week').add(1, 'day');
        const key = monday.format('YYYY-MM-DD');
        if (!weekGroupMap[key]) weekGroupMap[key] = { weekKey: key, weekStart: monday, menus: [] };
        weekGroupMap[key].menus.push(menu);
    }
    // A week is "past" if its Sunday is before today
    const isWeekPast = (wg: WeekGroup) => wg.weekStart.add(6, 'day').isBefore(today);

    const weekGroups = Object.values(weekGroupMap).sort((a, b) =>
        b.weekStart.valueOf() - a.weekStart.valueOf() // descending: future first, past last
    );

    const form = useForm({
        initialValues: {
            date: new Date(),
            deliveryZoneId: '' as string,
            items: [{ ...EMPTY_ITEM }] as MenuItemInputWithUIHelpers[],
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
            deliveryZoneId: menu.deliveryZoneId ?? '',
            items: menu.items.map(item => {
                const dietaryConfigs: Record<string, { price: number; description: string }> = {};
                const dietaryOptions = [...item.dietaryOptions];

                const spiceGroup = item.optionGroups.find(g => g.name === "Niveau d'épice");
                const spicePreset = spiceGroup ? String(spiceGroup.options.length) : '3';

                // Backward-compat: lift Protein/Complète from option groups if not already in tags
                const proteinGroup = item.optionGroups.find(g => g.name === 'Supplément Protéines');
                if (proteinGroup && proteinGroup.options.length > 0 && !dietaryOptions.includes('PROTEIN')) {
                    dietaryOptions.push('PROTEIN');
                }
                const completGroup = item.optionGroups.find(g => g.name === 'Version Complète');
                if (completGroup && completGroup.options.length > 0 && !dietaryOptions.includes('COMPLETE')) {
                    dietaryOptions.push('COMPLETE');
                }

                const variantGroup = item.optionGroups.find(g => g.name === 'Variantes / Régimes');
                const glutenGroup = item.optionGroups.find(g => g.name === 'Option Sans Gluten');

                dietaryOptions.forEach(tag => {
                    if (tag === 'SPICY') return;

                    if (tag === 'PROTEIN') {
                        dietaryConfigs[tag] = {
                            price: proteinGroup?.options[0]?.price ?? 0,
                            description: proteinGroup?.options[0]?.name || '',
                        };
                    } else if (tag === 'COMPLETE') {
                        dietaryConfigs[tag] = {
                            price: completGroup?.options[0]?.price ?? 0,
                            description: completGroup?.options[0]?.name || '',
                        };
                    } else if (tag === 'GLUTEN_FREE') {
                        dietaryConfigs[tag] = {
                            price: glutenGroup?.options[0]?.price ?? 0,
                            description: glutenGroup?.options[0]?.description || '',
                        };
                    } else {
                        // VEGETARIAN, VEGAN, HALAL — look in variant group (legacy) or option groups by name
                        const legacyGroup = item.optionGroups.find(g => g.name === `Option ${DIETARY_OPTIONS.find(o => o.value === tag)?.label}`);
                        const legacyLabels: Record<string, string> = { VEGETARIAN: 'Végétarienne', VEGAN: 'Végan', HALAL: 'Halal' };
                        const legacyOption = variantGroup?.options.find(o => o.name === `Version ${legacyLabels[tag] || tag}`);
                        dietaryConfigs[tag] = {
                            price: legacyGroup?.options[0]?.price ?? legacyOption?.price ?? 0,
                            description: legacyGroup?.options[0]?.description ?? legacyOption?.description ?? '',
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
                    dietaryOptions: dietaryOptions as any,
                    spiceLevel: item.spiceLevel || null,
                    optionGroups: [],
                    _dietaryConfigs: dietaryConfigs,
                    _spicePreset: spicePreset,
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
        } catch {
            notifications.show({ title: 'Erreur', message: 'Impossible de supprimer le menu', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleCopyOpen = (menu: MenuWithItems) => {
        setCopySource(menu);
        openCopy();
    };

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        try {
            const processedItems: MenuItemInput[] = values.items.map(item => {
                const optionGroups: OptionGroupInput[] = [];

                item.dietaryOptions.forEach(tag => {
                    const config = item._dietaryConfigs[tag];
                    const optionPrice = config ? Number(config.price) || 0 : 0;
                    const optionDesc = config?.description?.trim() || undefined;

                    if (tag === 'SPICY') {
                        const preset = SPICE_PRESETS.find(p => p.value === item._spicePreset) ?? SPICE_PRESETS[1];
                        optionGroups.push({
                            name: "Niveau d'épice",
                            isRequired: true,
                            allowMultiple: false,
                            maxOptions: 1,
                            options: preset.options.map(name => ({ name, price: 0, description: undefined })),
                        });
                    } else if (tag === 'PROTEIN') {
                        optionGroups.push({
                            name: 'Supplément Protéines',
                            isRequired: false,
                            allowMultiple: false,
                            maxOptions: 1,
                            options: [{ name: optionDesc || 'Extra Protéines', price: optionPrice, description: undefined }],
                        });
                    } else if (tag === 'COMPLETE') {
                        optionGroups.push({
                            name: 'Version Complète',
                            isRequired: false,
                            allowMultiple: false,
                            maxOptions: 1,
                            options: [{ name: optionDesc || 'Version Complète', price: optionPrice, description: undefined }],
                        });
                    } else if (tag === 'GLUTEN_FREE') {
                        optionGroups.push({
                            name: 'Option Sans Gluten',
                            isRequired: false,
                            allowMultiple: false,
                            maxOptions: 1,
                            options: [{ name: optionDesc || 'Version Sans Gluten', price: optionPrice, description: undefined }],
                        });
                    } else {
                        // VEGETARIAN, VEGAN, HALAL
                        const label = DIETARY_OPTIONS.find(o => o.value === tag)?.label || tag;
                        optionGroups.push({
                            name: `Option ${label}`,
                            isRequired: false,
                            allowMultiple: false,
                            maxOptions: 1,
                            options: [{ name: optionDesc || `Version ${label}`, price: optionPrice, description: undefined }],
                        });
                    }
                });

                return {
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    ingredients: item.ingredients,
                    price: item.price,
                    category: item.category,
                    dietaryOptions: item.dietaryOptions,
                    spiceLevel: undefined,
                    optionGroups,
                };
            });

            const zoneId = values.deliveryZoneId || null;
            const result = editingId
                ? await updateMenuAction(editingId, values.date, processedItems, zoneId)
                : await createMenuAction(values.date, processedItems, zoneId);

            if (result.success) {
                notifications.show({
                    title: 'Succès',
                    message: editingId ? 'Menu mis à jour' : 'Menu créé',
                    color: 'green',
                });
                handleClose();
            } else {
                notifications.show({ title: 'Erreur', message: result.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Une erreur inconnue est survenue', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        form.insertListItem('items', { ...EMPTY_ITEM } as unknown as MenuItemInputWithUIHelpers);
    };

    const removeItem = (index: number) => {
        form.removeListItem('items', index);
    };

    return (
        <Container fluid>
            <Group justify="space-between" mb="lg">
                <Title order={2}>Gestion des Menus</Title>
                <Button leftSection={<IconPlus size={14} />} onClick={openStepper}>Nouveau Menu</Button>
            </Group>

            {menus.length === 0 ? (
                <Text c="dimmed">Aucun menu pour le moment.</Text>
            ) : (
                <Accordion
                    defaultValue={currentWeekKey}
                    variant="separated"
                    radius="md"
                >
                    {weekGroups.map(wg => {
                        const past = isWeekPast(wg);
                        const weekEnd = wg.weekStart.add(4, 'day'); // vendredi
                        const weekLabel = `${wg.weekStart.locale('fr').format('D MMMM')} – ${weekEnd.locale('fr').format('D MMMM YYYY')}`;
                        const menuIds = wg.menus.map(m => m.id);

                        return (
                            <Accordion.Item key={wg.weekKey} value={wg.weekKey}>
                                <Accordion.Control>
                                    <Group justify="space-between" wrap="nowrap" pr="sm">
                                        <Group gap="sm">
                                            <ThemeIcon
                                                size="sm"
                                                color={past ? 'gray' : wg.weekKey === currentWeekKey ? 'blue' : 'teal'}
                                                variant="light"
                                                radius="xl"
                                            >
                                                {past ? <IconCalendarStats size={12} /> : <IconCalendarEvent size={12} />}
                                            </ThemeIcon>
                                            <Text fw={600} c={past ? 'dimmed' : undefined} tt="capitalize">
                                                Semaine du {weekLabel}
                                            </Text>
                                            {wg.weekKey === currentWeekKey && (
                                                <Badge color="blue" variant="filled" size="xs">Cette semaine</Badge>
                                            )}
                                            <Badge color={past ? 'gray' : 'blue'} variant="light" size="sm">
                                                {wg.menus.length} menu{wg.menus.length > 1 ? 's' : ''}
                                            </Badge>
                                        </Group>

                                        {!past && (
                                            <Button
                                                size="xs"
                                                variant="light"
                                                color="indigo"
                                                leftSection={<IconCalendarWeek size={13} />}
                                                loading={weeklyNotifying}
                                                onClick={e => { e.stopPropagation(); handleWeeklyNotify(menuIds); }}
                                            >
                                                Notifier
                                            </Button>
                                        )}
                                    </Group>
                                </Accordion.Control>

                                <Accordion.Panel>
                                    <Grid pt="xs">
                                        {wg.menus.map(menu => (
                                            <Grid.Col key={menu.id} span={{ base: 12, md: 6, lg: 4 }}>
                                                <MenuCard
                                                    menu={menu}
                                                    isPast={dayjs(menu.date).isBefore(today)}
                                                    onEdit={handleEdit}
                                                    onDelete={handleDelete}
                                                    onCopy={handleCopyOpen}
                                                />
                                            </Grid.Col>
                                        ))}
                                    </Grid>
                                </Accordion.Panel>
                            </Accordion.Item>
                        );
                    })}
                </Accordion>
            )}

            {/* ── Create Menu Stepper (quick creation from library) ── */}
            <CreateMenuStepper
                opened={stepperOpened}
                onClose={closeStepper}
                zones={zones}
                onSuccess={() => {
                    // Optionally refetch menus here or use router.refresh()
                    window.location.reload();
                }}
            />

            {/* ── Create / Edit modal ── */}
            <Modal opened={opened} onClose={handleClose} title={editingId ? "Modifier le menu" : "Créer un nouveau menu"} size="xl" fullScreen={isMobile}>
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        <DatePickerInput
                            label="Date du menu"
                            placeholder="Choisir une date"
                            locale="fr"
                            {...form.getInputProps('date')}
                        />

                        <Select
                            label="Zone de livraison"
                            description="Optionnel — restreint les commandes à une zone géographique."
                            placeholder="Aucune restriction (livraison partout)"
                            clearable
                            data={zones.map(z => ({ value: z.id, label: z.name }))}
                            {...form.getInputProps('deliveryZoneId')}
                            leftSection={
                                form.values.deliveryZoneId
                                    ? <Box style={{ width: 10, height: 10, borderRadius: 2, background: zones.find(z => z.id === form.values.deliveryZoneId)?.color ?? '#888' }} />
                                    : null
                            }
                        />

                        <Text fw={500} mt="md">Plats du jour</Text>

                        {form.values.items.map((item, index) => (
                            <Card key={index} withBorder shadow="sm" radius="md">
                                <Stack gap="xs">
                                    <Group align="flex-start" wrap="nowrap">
                                        <Stack gap="xs" style={{ flex: 1 }}>
                                            <SimpleGrid cols={{ base: 1, sm: 2 }}>
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
                                            </SimpleGrid>
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

                                            <MultiSelect
                                                label="Tags (Régimes & Info)"
                                                description="Sélectionnez les tags applicables. Configurez les détails ci-dessous."
                                                data={DIETARY_OPTIONS}
                                                placeholder="Sélectionner..."
                                                hidePickedOptions
                                                value={form.values.items[index].dietaryOptions as string[]}
                                                onChange={(newTags) => {
                                                    form.setFieldValue(`items.${index}.dietaryOptions`, newTags as any);
                                                    const currentConfigs = form.values.items[index]._dietaryConfigs || {};
                                                    const updatedConfigs = { ...currentConfigs };
                                                    newTags.forEach(tag => {
                                                        if (!updatedConfigs[tag]) updatedConfigs[tag] = { price: 0, description: '' };
                                                    });
                                                    form.setFieldValue(`items.${index}._dietaryConfigs`, updatedConfigs);
                                                }}
                                            />

                                            {form.values.items[index].dietaryOptions.length > 0 && (
                                                <Stack mt="md" gap="xs">
                                                    <Text size="sm" fw={500}>Configuration des Tags :</Text>
                                                    {form.values.items[index].dietaryOptions.map((tag) => {
                                                        if (tag === 'SPICY') {
                                                            return (
                                                                <Card key={tag} withBorder p="xs" bg="gray.0">
                                                                    <Group align="flex-end">
                                                                        <Badge color="red" mt={4}>Épicé</Badge>
                                                                        <Select
                                                                            label="Niveaux proposés"
                                                                            size="xs"
                                                                            data={SPICE_PRESETS.map(p => ({ value: p.value, label: p.label }))}
                                                                            style={{ flex: 1 }}
                                                                            {...form.getInputProps(`items.${index}._spicePreset`)}
                                                                        />
                                                                    </Group>
                                                                </Card>
                                                            );
                                                        }
                                                        return (
                                                            <Card key={tag} withBorder p="xs" bg="gray.0">
                                                                <SimpleGrid cols={{ base: 1, sm: 3 }} style={{ alignItems: 'flex-start' }}>
                                                                    <Badge color="green" mt={4}>
                                                                        {DIETARY_OPTIONS.find(opt => opt.value === tag)?.label || tag}
                                                                    </Badge>
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
                                                                        {...form.getInputProps(`items.${index}._dietaryConfigs.${tag}.description`)}
                                                                    />
                                                                </SimpleGrid>
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

                        <Group gap="sm">
                            <Button
                                variant="light"
                                onClick={() => handleOpenDishSelect('STARTER')}
                                leftSection={<IconPlus size={14} />}
                            >
                                Entrée
                            </Button>
                            <Button
                                variant="light"
                                onClick={() => handleOpenDishSelect('MAIN')}
                                leftSection={<IconPlus size={14} />}
                            >
                                Plat
                            </Button>
                            <Button
                                variant="light"
                                onClick={() => handleOpenDishSelect('DESSERT')}
                                leftSection={<IconPlus size={14} />}
                            >
                                Dessert
                            </Button>
                            <Button
                                variant="light"
                                onClick={() => handleOpenDishSelect('DRINK')}
                                leftSection={<IconPlus size={14} />}
                            >
                                Boisson
                            </Button>
                        </Group>

                        <Group justify="flex-end" mt="xl">
                            <Button variant="default" onClick={handleClose}>Annuler</Button>
                            <Button type="submit" loading={loading}>
                                {editingId ? "Enregistrer" : "Créer le menu"}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            {/* ── Select Dish Modal ── */}
            <SelectDishModal
                opened={dishSelectOpened}
                onClose={closeDishSelect}
                dishes={dishLibrary}
                onSelect={handleSelectDish}
                category={dishSelectCategory}
            />

            {/* ── Copy Modal ── */}
            <CopyMenuModal
                opened={copyOpened}
                onClose={closeCopy}
                sourceMenu={copySource}
            />
        </Container>
    );
}
