"use client"
import { MenuItem as MenuItemType, ItemCategory, DietaryOption } from "@prisma/client";
import { Card, Text, Badge, Button, Group, rem } from "@mantine/core";
import { IconLeaf, IconMeat, IconCheese, IconPepper, IconDisabled } from "@tabler/icons-react";

export default function MenuItemCard({ item }: { item: MenuItemType }) {

    const getBadgeColor = (cat: ItemCategory) => {
        switch (cat) {
            case 'MAIN': return 'blue';
            case 'STARTER': return 'green';
            case 'DESSERT': return 'pink';
            case 'DRINK': return 'yellow';
            default: return 'gray';
        }
    }

    const getCategoryLabel = (cat: ItemCategory) => {
        switch (cat) {
            case 'MAIN': return 'Plat';
            case 'STARTER': return 'Entrée';
            case 'DESSERT': return 'Dessert';
            case 'DRINK': return 'Boisson';
            default: return cat;
        }
    }

    const getDietaryIcon = (option: DietaryOption) => {
        const style = { width: rem(16), height: rem(16) };
        switch (option) {
            case 'VEGETARIAN': return <IconLeaf style={style} />;
            case 'VEGAN': return <IconLeaf style={{ ...style, color: 'green' }} />;
            case 'GLUTEN_FREE': return <IconDisabled style={style} />;
            case 'SPICY': return <IconPepper style={style} />;
            case 'HALAL': return <Text size="xs" fw={700}>H</Text>;
            default: return null;
        }
    }

    const getDietaryLabel = (option: DietaryOption) => {
        switch (option) {
            case 'VEGETARIAN': return 'Végétarien';
            case 'VEGAN': return 'Vegan';
            case 'GLUTEN_FREE': return 'Sans Gluten';
            case 'SPICY': return 'Épicé';
            case 'HALAL': return 'Halal';
            default: return option;
        }
    }

    const getDietaryColor = (option: DietaryOption) => {
        switch (option) {
            case 'VEGETARIAN': return 'green';
            case 'VEGAN': return 'teal';
            case 'GLUTEN_FREE': return 'orange';
            case 'SPICY': return 'red';
            case 'HALAL': return 'grape';
            default: return 'gray';
        }
    }

    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>{item.name}</Text>
                <Badge color={getBadgeColor(item.category)}>{getCategoryLabel(item.category)}</Badge>
            </Group>

            {item.dietaryOptions && item.dietaryOptions.length > 0 && (
                <Group gap={5} mb="xs">
                    {item.dietaryOptions.map((option) => (
                        <Badge
                            key={option}
                            variant="light"
                            color={getDietaryColor(option)}
                            size="sm"
                            leftSection={getDietaryIcon(option)}
                        >
                            {getDietaryLabel(option)}
                        </Badge>
                    ))}
                </Group>
            )}

            <Text size="sm" c="dimmed" style={{ minHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.description}
            </Text>

            <Group justify="space-between" mt="md">
                <Text fw={700} size="lg">{item.price.toFixed(2)} €</Text>
            </Group>
        </Card>
    )
}
