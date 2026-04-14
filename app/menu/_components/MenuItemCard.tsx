"use client";

import { MenuItem as MenuItemType, ItemCategory, DietaryOption } from "@prisma/client";
import { Text, Badge, Button, Group, rem } from "@mantine/core";
import { IconLeaf, IconPepper, IconDisabled, IconShoppingCartPlus, IconSalad, IconCake, IconGlass, IconToolsKitchen2 } from "@tabler/icons-react";

type OptionItem = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    groupId: string;
};

type OptionGroup = {
    id: string;
    name: string;
    isRequired: boolean;
    allowMultiple: boolean;
    maxOptions: number | null;
    options: OptionItem[];
};

export type MenuItemWithOptions = MenuItemType & {
    optionGroups: OptionGroup[];
};

interface MenuItemCardProps {
    item: MenuItemWithOptions;
    onAdd?: (item: MenuItemWithOptions) => void;
    canOrder?: boolean;
    isBlocked?: boolean;
}

export const CATEGORY_CONFIG: Record<ItemCategory, { label: string; bg: string; icon: React.ReactNode }> = {
    MAIN:    { label: 'Plat',    bg: '#228be6', icon: <IconToolsKitchen2 size={22} color="white" /> },
    STARTER: { label: 'Entrée',  bg: '#12b886', icon: <IconSalad size={22} color="white" /> },
    DESSERT: { label: 'Dessert', bg: '#e64980', icon: <IconCake size={22} color="white" /> },
    DRINK:   { label: 'Boisson', bg: '#f59f00', icon: <IconGlass size={22} color="white" /> },
};

const DIETARY_CONFIG: Partial<Record<DietaryOption, { label: string; color: string; icon: React.ReactNode }>> = {
    VEGETARIAN: { label: 'Végétarien', color: 'green',  icon: <IconLeaf style={{ width: rem(11), height: rem(11) }} /> },
    VEGAN:      { label: 'Vegan',      color: 'teal',   icon: <IconLeaf style={{ width: rem(11), height: rem(11) }} /> },
    GLUTEN_FREE:{ label: 'Sans gluten',color: 'orange', icon: <IconDisabled style={{ width: rem(11), height: rem(11) }} /> },
    SPICY:      { label: 'Épicé',      color: 'red',    icon: <IconPepper style={{ width: rem(11), height: rem(11) }} /> },
    HALAL:      { label: 'Halal',      color: 'grape',  icon: <Text size="xs" fw={800} lh={1}>H</Text> },
};

export default function MenuItemCard({ item, onAdd, canOrder = true, isBlocked = false }: MenuItemCardProps) {
    const config = CATEGORY_CONFIG[item.category] ?? { label: item.category, bg: '#868e96', icon: null };

    return (
        <div style={{
            display: 'flex',
            borderRadius: 'var(--mantine-radius-md)',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            background: 'white',
            border: '1px solid var(--mantine-color-gray-2)',
            opacity: isBlocked ? 0.6 : 1,
            height: '100%',
        }}>
            {/* Trait coloré gauche */}
            <div style={{ width: 5, flexShrink: 0, background: config.bg }} />

            {/* Contenu */}
            <div style={{
                flex: 1,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minWidth: 0,
            }}>
                {/* Nom + badge épuisé */}
                <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
                    <Text fw={700} size="sm" lh={1.3} style={{ flex: 1, minWidth: 0 }}>
                        {item.name}
                    </Text>
                    {isBlocked && (
                        <Badge color="red" variant="filled" size="xs" style={{ flexShrink: 0 }}>Épuisé</Badge>
                    )}
                </Group>

                {/* Description */}
                <Text size="xs" c="dimmed" lineClamp={2}>
                    {item.description}
                </Text>

                <div style={{ flex: 1 }} />

                {/* Options + tags diététiques */}
                {((item.optionGroups && item.optionGroups.length > 0) || (item.dietaryOptions && item.dietaryOptions.length > 0)) && (
                    <Group gap={4} wrap="wrap" align="center">
                        {item.optionGroups && item.optionGroups.length > 0 && (
                            <Text size="xs" c="dimmed">{item.optionGroups.length > 1 ? 'Options :' : 'Option :'}</Text>
                        )}
                        {item.dietaryOptions && item.dietaryOptions.map((opt) => {
                            const d = DIETARY_CONFIG[opt];
                            if (!d) return null;
                            return (
                                <Badge key={opt} color={d.color} variant="light" size="xs" leftSection={d.icon}>
                                    {d.label}
                                </Badge>
                            );
                        })}
                    </Group>
                )}

                {/* Prix + bouton ajouter */}
                <Group justify="space-between" align="center" mt={2}>
                    <Text fw={800} size="md" style={{ color: config.bg, lineHeight: 1 }}>
                        {item.price.toFixed(2)} €
                    </Text>
                    {onAdd && canOrder && !isBlocked && (
                        <Button
                            size="xs"
                            style={{ backgroundColor: config.bg, border: 'none' }}
                            leftSection={<IconShoppingCartPlus size={13} />}
                            onClick={() => onAdd(item)}
                            radius="md"
                        >
                            Ajouter
                        </Button>
                    )}
                </Group>
            </div>
        </div>
    );
}
