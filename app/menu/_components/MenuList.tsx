"use client";

import { Menu, MenuItem, DietaryOption } from "@prisma/client";
import { Tabs, SimpleGrid, Text, Group, Button, Badge } from "@mantine/core";
import Link from "next/link";
import dayjs from "dayjs";
import { useState } from "react";
import MenuItemCard from "./MenuItemCard";

interface MenuListProps {
    menus: (Menu & { items: MenuItem[] })[];
}

export default function MenuList({ menus }: MenuListProps) {
    if (!menus || menus.length === 0) {
        return <Text>Aucun menu disponible pour cette semaine.</Text>
    }

    const [activeTab, setActiveTab] = useState<string | null>(menus[0].id);
    const [selectedDietary, setSelectedDietary] = useState<string[]>([]);

    const filterItems = (items: MenuItem[]) => {
        if (selectedDietary.length === 0) return items;
        return items.filter(item =>
            selectedDietary.every(tag => item.dietaryOptions?.includes(tag as DietaryOption))
        );
    };

    const isPastDate = (date: Date) => {
        return dayjs(date).isBefore(dayjs().startOf('day'));
    };

    return (
        <>
            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List mb="lg">
                    {menus.map((menu) => {
                        const isPast = isPastDate(menu.date);
                        return (
                            <Tabs.Tab
                                key={menu.id}
                                value={menu.id}
                                color={isPast ? 'gray' : undefined}
                                style={{ opacity: isPast ? 0.6 : 1 }}
                            >
                                {dayjs(menu.date).format("dddd, MMM D")}
                                {isPast && <Badge size="xs" color="gray" ml="xs">Passé</Badge>}
                            </Tabs.Tab>
                        );
                    })}
                </Tabs.List>

                {menus.map((menu) => {
                    const filteredItems = filterItems(menu.items);
                    const isPast = isPastDate(menu.date);

                    return (
                        <Tabs.Panel key={menu.id} value={menu.id}>
                            <Group justify="flex-end" mb="md">
                                <Button
                                    component={isPast ? 'button' : (Link as any)}
                                    href={isPast ? undefined : `/order/${menu.id}`}
                                    size="md"
                                    variant="gradient"
                                    gradient={{ from: 'blue', to: 'cyan' }}
                                    disabled={isPast}
                                >
                                    {isPast ? 'Menu expiré' : 'Commander ce Menu'}
                                </Button>
                            </Group>
                            {filteredItems.length === 0 ? (
                                <Text c="dimmed">Aucun plat disponible pour ce jour.</Text>
                            ) : (
                                <SimpleGrid
                                    cols={{ base: 1, sm: 2, md: 3 }}
                                    spacing="lg"
                                    style={{ opacity: isPast ? 0.5 : 1 }}
                                >
                                    {filteredItems.map(item => (
                                        <MenuItemCard key={item.id} item={item} />
                                    ))}
                                </SimpleGrid>
                            )}
                        </Tabs.Panel>
                    );
                })}
            </Tabs>
        </>
    );
}
