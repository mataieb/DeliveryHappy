"use client";

import { Menu, MenuItem, DietaryOption } from "@prisma/client";
import { Tabs, SimpleGrid, Text, Group, Button, Badge, Tooltip } from "@mantine/core";
import Link from "next/link";
import dayjs from "dayjs";
import 'dayjs/locale/fr';
import { useState } from "react";
import MenuItemCard from "./MenuItemCard";
import { isOrderingOpen, orderingDeadline } from "@/lib/ordering";

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

    const canOrder = (date: Date) => !isPastDate(date) && isOrderingOpen(date);

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
                                {dayjs(menu.date).locale('fr').format("dddd D MMM")}
                                {isPast && <Badge size="xs" color="gray" ml="xs">Passé</Badge>}
                            </Tabs.Tab>
                        );
                    })}
                </Tabs.List>

                {menus.map((menu) => {
                    const filteredItems = filterItems(menu.items);
                    const isPast = isPastDate(menu.date);
                    const open = canOrder(menu.date);
                    const deadline = orderingDeadline(menu.date);

                    return (
                        <Tabs.Panel key={menu.id} value={menu.id}>
                            <Group justify="flex-end" mb="md">
                                <Tooltip
                                    label={open ? `Commandez avant le ${deadline}` : isPast ? 'Menu passé' : `Commandes fermées depuis le ${deadline}`}
                                    withArrow
                                >
                                    <Button
                                        component={open ? (Link as any) : 'button'}
                                        href={open ? `/order/${menu.id}` : undefined}
                                        size="md"
                                        variant="gradient"
                                        gradient={{ from: 'blue', to: 'cyan' }}
                                        disabled={!open}
                                    >
                                        {isPast ? 'Menu passé' : open ? 'Commander ce Menu' : 'Commandes fermées'}
                                    </Button>
                                </Tooltip>
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
