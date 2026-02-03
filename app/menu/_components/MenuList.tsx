"use client";

import { Menu, MenuItem, DietaryOption } from "@prisma/client";
import { Tabs, SimpleGrid, Text, Group, Chip, Button } from "@mantine/core";
import Link from "next/link";
import dayjs from "dayjs";
import { useState } from "react";
import MenuItemCard from "./MenuItemCard";

interface MenuListProps {
    menus: (Menu & { items: MenuItem[] })[];
}

export default function MenuList({ menus }: MenuListProps) {
    if (!menus || menus.length === 0) {
        return <Text>No menus available for the coming days.</Text>
    }

    const [activeTab, setActiveTab] = useState<string | null>(menus[0].id);
    const [selectedDietary, setSelectedDietary] = useState<string[]>([]);

    const filterItems = (items: MenuItem[]) => {
        if (selectedDietary.length === 0) return items;
        return items.filter(item =>
            selectedDietary.every(tag => item.dietaryOptions?.includes(tag as DietaryOption))
        );
    };

    return (
        <>
            <Group mb="lg">
                <Text size="sm" fw={500}>Dietary Preferences:</Text>
                <Chip.Group multiple value={selectedDietary} onChange={setSelectedDietary}>
                    {Object.values(DietaryOption).map((option) => (
                        <Chip key={String(option)} value={String(option)} variant="outline" size="sm" radius="sm">
                            {(option as string).replace('_', ' ')}
                        </Chip>
                    ))}
                </Chip.Group>
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List mb="lg">
                    {menus.map((menu) => (
                        <Tabs.Tab key={menu.id} value={menu.id}>
                            {dayjs(menu.date).format("dddd, MMM D")}
                        </Tabs.Tab>
                    ))}
                </Tabs.List>

                {menus.map((menu) => {
                    const filteredItems = filterItems(menu.items);
                    return (
                        <Tabs.Panel key={menu.id} value={menu.id}>
                            <Group justify="flex-end" mb="md">
                                <Button component={Link} href={`/order/${menu.id}`} size="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                                    Commander ce Menu
                                </Button>
                            </Group>
                            {filteredItems.length === 0 ? (
                                <Text c="dimmed">No items match your dietary preferences for this day.</Text>
                            ) : (
                                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
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
