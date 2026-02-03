"use client";

import { Menu, MenuItem, DietaryOption } from "@prisma/client";
import { Tabs, Title, Text, Button, Stack, Card, Group, Radio, Badge, Textarea, Container, Alert } from "@mantine/core";
import { useForm } from "@mantine/form";
import dayjs from "dayjs";
import 'dayjs/locale/fr';
import { useState, useEffect } from "react";
import { IconInfoCircle } from "@tabler/icons-react";

interface MenuListProps {
    menus: (Menu & { items: MenuItem[] })[];
}

export default function MenuList({ menus }: MenuListProps) {
    if (!menus || menus.length === 0) {
        return <Text>Aucun menu disponible pour les prochains jours.</Text>
    }

    // Default to first day
    const [activeTab, setActiveTab] = useState<string | null>(menus[0].id);

    return (
        <Container size="md">
            <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
                <Tabs.List mb="lg" justify="center">
                    {menus.map((menu) => (
                        <Tabs.Tab key={menu.id} value={menu.id} px="xl" py="md">
                            <Text fz="lg" fw={500}>{dayjs(menu.date).locale('fr').format("dddd D MMMM")}</Text>
                        </Tabs.Tab>
                    ))}
                </Tabs.List>

                {menus.map((menu) => (
                    <Tabs.Panel key={menu.id} value={menu.id}>
                        <MenuOrderForm menu={menu} />
                    </Tabs.Panel>
                ))}
            </Tabs>
        </Container>
    );
}

function MenuOrderForm({ menu }: { menu: Menu & { items: MenuItem[] } }) {
    const mainDishes = menu.items.filter(i => i.category === 'MAIN');
    const desserts = menu.items.filter(i => i.category === 'DESSERT');
    // We could handle other categories if needed

    const form = useForm({
        initialValues: {
            mainId: '',
            dessertId: '', // Optional -> empty string means none
            comments: {} as Record<string, string>, // itemId -> comment
        },
        validate: {
            mainId: (value) => (value ? null : 'Veuillez choisir un plat principal'),
        },
    });

    const handleSubmit = (values: typeof form.values) => {
        console.log("Commande:", values);
        alert("Commande validée (simulation) !");
    };

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="xl">
                {/* En-tête présentation simple */}
                <BoxSection title="Menu du Jour" description="Faites votre choix parmi nos plats frais et faits maison qui changent tous les jours.">
                    <Alert variant="light" color="blue" title="Info" icon={<IconInfoCircle />}>
                        Commandez avant 11h pour être livré à midi.
                    </Alert>
                </BoxSection>

                {/* Section PLATS */}
                <BoxSection title="1. Choisissez votre plat principal *" description="Obligatoire">
                    {mainDishes.length === 0 ? (
                        <Text c="dimmed">Aucun plat disponible ce jour.</Text>
                    ) : (
                        <Radio.Group
                            {...form.getInputProps('mainId')}
                            withAsterisk
                        >
                            <Stack>
                                {mainDishes.map(item => (
                                    <SelectableItemCard
                                        key={item.id}
                                        item={item}
                                        isSelected={form.values.mainId === item.id}
                                        commentValue={form.values.comments[item.id] || ''}
                                        onCommentChange={(val) => form.setFieldValue(`comments.${item.id}`, val)}
                                    >
                                        <Radio value={item.id} label={
                                            <Text fw={500} size="lg">{item.name} - {item.price}€</Text>
                                        } />
                                    </SelectableItemCard>
                                ))}
                            </Stack>
                        </Radio.Group>
                    )}
                    {form.errors.mainId && <Text c="red" size="sm" mt="xs">{form.errors.mainId}</Text>}
                </BoxSection>

                {/* Section DESSERTS */}
                <BoxSection title="2. Une petite douceur ? (Optionnel)" description="Cochez si vous souhaitez un dessert">
                    {desserts.length === 0 ? (
                        <Text c="dimmed">Aucun dessert disponible ce jour.</Text>
                    ) : (
                        <Radio.Group
                            value={form.values.dessertId}
                            onChange={(val) => {
                                // Allow toggling off if clicking same (handled via custom logic if standard radio doesn't support deselect)
                                // Standard radio group doesn't deselect easily. let's add a "No dessert" or use custom.
                                // User said "click to say they wish dessert".
                                form.setFieldValue('dessertId', val);
                            }}
                        >
                            <Stack>
                                <Radio value="" label="Pas de dessert" mb="xs" />
                                {desserts.map(item => (
                                    <SelectableItemCard
                                        key={item.id}
                                        item={item}
                                        isSelected={form.values.dessertId === item.id}
                                        commentValue={form.values.comments[item.id] || ''}
                                        onCommentChange={(val) => form.setFieldValue(`comments.${item.id}`, val)}
                                    >
                                        <Radio value={item.id} label={
                                            <Text fw={500} size="lg">{item.name} - {item.price}€</Text>
                                        } />
                                    </SelectableItemCard>
                                ))}
                            </Stack>
                        </Radio.Group>
                    )}
                </BoxSection>

                <Button size="xl" type="submit" fullWidth mt="xl">
                    Valider ma commande
                </Button>
            </Stack>
        </form>
    );
}

function BoxSection({ title, description, children }: { title: string, description?: string, children: React.ReactNode }) {
    return (
        <Stack gap="md">
            <div>
                <Title order={3}>{title}</Title>
                {description && <Text c="dimmed">{description}</Text>}
            </div>
            {children}
        </Stack>
    );
}

function SelectableItemCard({ item, children, isSelected, commentValue, onCommentChange }: {
    item: MenuItem,
    children: React.ReactNode,
    isSelected: boolean,
    commentValue: string,
    onCommentChange: (val: string) => void
}) {
    return (
        <Card withBorder shadow={isSelected ? 'sm' : 'none'} padding="md" radius="md" style={{
            borderColor: isSelected ? 'var(--mantine-color-blue-6)' : undefined,
            backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : undefined
        }}>
            <Stack gap="xs">
                <Group justify="space-between" align="flex-start">
                    {children}
                    {/* Badges for dietary */}
                    <Group gap={5}>
                        {item.dietaryOptions?.map((opt) => (
                            <Badge key={opt} size="xs" variant="outline">{opt.substring(0, 3)}</Badge>
                        ))}
                    </Group>
                </Group>

                {item.description && <Text size="sm" c="dimmed" pl={28}>{item.description}</Text>}

                {/* Ingredients Display */}
                {item.ingredients && (
                    <Text size="xs" c="dimmed" pl={28}>
                        <Text span fw={500}>Ingrédients:</Text> {item.ingredients}
                    </Text>
                )}

                {/* Comment Area - Only if selected */}
                {isSelected && (
                    <Textarea
                        mt="sm"
                        placeholder={`Précisions pour ${item.name} (ex: sans oignons, allergie...)`}
                        label="Commentaire / Allergie"
                        size="xs"
                        autosize
                        value={commentValue}
                        onChange={(e) => onCommentChange(e.currentTarget.value)}
                    />
                )}
            </Stack>
        </Card>
    );
}
