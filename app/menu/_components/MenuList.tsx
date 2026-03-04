"use client";

import { Menu } from "@prisma/client";
import { Tabs, SimpleGrid, Text, Group, Badge, Alert, Button, Modal, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import dayjs from "dayjs";
import 'dayjs/locale/fr';
import { useState } from "react";
import MenuItemCard, { MenuItemWithOptions } from "./MenuItemCard";
import ItemOptionsModal from "./ItemOptionsModal";
import { isOrderingOpen, orderingDeadline } from "@/lib/ordering";
import { useCart } from "@/app/_components/CartContext";
import { CartItem, generateCartId } from "@/lib/cart";
import { IconAlertCircle } from "@tabler/icons-react";

interface MenuListProps {
    menus: (Menu & { items: MenuItemWithOptions[] })[];
}

// Pending item waiting for cross-day confirmation
interface PendingSwitch {
    menuId: string;
    menuDate: string;
    cartItem: CartItem;
}

export default function MenuList({ menus }: MenuListProps) {
    const { cart, addItem, switchCart } = useCart();
    const [activeTab, setActiveTab] = useState<string | null>(menus[0]?.id ?? null);
    const [modalItem, setModalItem] = useState<MenuItemWithOptions | null>(null);
    const [pendingMenuId, setPendingMenuId] = useState<string | null>(null);
    const [pendingMenuDate, setPendingMenuDate] = useState<string | null>(null);
    const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch | null>(null);
    const [optionsOpened, { open: openOptions, close: closeOptions }] = useDisclosure(false);
    const [switchOpened, { open: openSwitch, close: closeSwitch }] = useDisclosure(false);

    if (!menus || menus.length === 0) {
        return <Text>Aucun menu disponible pour cette semaine.</Text>;
    }

    const isPastDate = (date: Date) => dayjs(date).isBefore(dayjs().startOf('day'));
    const canOrder = (date: Date) => !isPastDate(date) && isOrderingOpen(date);

    const buildSimpleCartItem = (item: MenuItemWithOptions): CartItem => ({
        cartId: generateCartId(),
        menuItemId: item.id,
        menuItemName: item.name,
        menuItemCategory: item.category,
        basePrice: item.price,
        optionPrice: 0,
        totalPrice: item.price,
        selectedOptions: [],
        selectedOptionsRaw: undefined,
    });

    const doAdd = (menuId: string, menuDate: string, cartItem: CartItem) => {
        const result = addItem(menuId, menuDate, cartItem);
        if (result === 'wrong_day') {
            setPendingSwitch({ menuId, menuDate, cartItem });
            openSwitch();
        }
    };

    const handleConfirmSwitch = () => {
        if (pendingSwitch) {
            switchCart(pendingSwitch.menuId, pendingSwitch.menuDate, pendingSwitch.cartItem);
        }
        setPendingSwitch(null);
        closeSwitch();
    };

    const handleAddItem = (menuId: string, menuDate: string, item: MenuItemWithOptions) => {
        const hasOptions = item.optionGroups && item.optionGroups.length > 0;
        if (hasOptions) {
            setModalItem(item);
            setPendingMenuId(menuId);
            setPendingMenuDate(menuDate);
            openOptions();
        } else {
            doAdd(menuId, menuDate, buildSimpleCartItem(item));
        }
    };

    const handleModalConfirm = (cartItem: CartItem) => {
        closeOptions();
        if (pendingMenuId && pendingMenuDate) {
            doAdd(pendingMenuId, pendingMenuDate, cartItem);
        }
        setModalItem(null);
        setPendingMenuId(null);
        setPendingMenuDate(null);
    };

    return (
        <>
            {/* Options modal (for items with option groups) */}
            <ItemOptionsModal
                item={modalItem}
                opened={optionsOpened}
                onClose={() => {
                    closeOptions();
                    setModalItem(null);
                }}
                onConfirm={handleModalConfirm}
            />

            {/* Cross-day switch confirmation modal */}
            <Modal
                opened={switchOpened}
                onClose={() => { closeSwitch(); setPendingSwitch(null); }}
                title="Changer de jour ?"
                centered
                size="sm"
            >
                <Stack gap="md">
                    <Text size="sm">
                        Votre panier contient déjà des plats du{' '}
                        <strong>{dayjs(cart?.menuDate).locale('fr').format('dddd D MMMM')}</strong>.
                        <br /><br />
                        Voulez-vous vider le panier et commencer une commande pour{' '}
                        <strong>{dayjs(pendingSwitch?.menuDate).locale('fr').format('dddd D MMMM')}</strong> ?
                    </Text>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="subtle" color="gray" onClick={() => { closeSwitch(); setPendingSwitch(null); }}>
                            Annuler
                        </Button>
                        <Button color="orange" onClick={handleConfirmSwitch}>
                            Changer de jour
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List mb="lg">
                    {menus.map((menu) => {
                        const isPast = isPastDate(menu.date);
                        const cartItemsForDay = cart?.menuId === menu.id ? cart.items.length : 0;
                        return (
                            <Tabs.Tab
                                key={menu.id}
                                value={menu.id}
                                color={isPast ? 'gray' : undefined}
                                style={{ opacity: isPast ? 0.6 : 1 }}
                            >
                                {dayjs(menu.date).locale('fr').format("dddd D MMM")}
                                {isPast && <Badge size="xs" color="gray" ml="xs">Passé</Badge>}
                                {cartItemsForDay > 0 && (
                                    <Badge size="xs" color="indigo" ml="xs">🛒 {cartItemsForDay}</Badge>
                                )}
                            </Tabs.Tab>
                        );
                    })}
                </Tabs.List>

                {menus.map((menu) => {
                    const isPast = isPastDate(menu.date);
                    const open = canOrder(menu.date);
                    const deadline = orderingDeadline(menu.date);
                    const menuDateStr = menu.date instanceof Date ? menu.date.toISOString() : String(menu.date);

                    return (
                        <Tabs.Panel key={menu.id} value={menu.id}>
                            <Group justify="space-between" mb="md" align="center">
                                <Text size="sm" c="dimmed">
                                    {open
                                        ? `Commandez avant le ${deadline}`
                                        : isPast
                                            ? 'Menu passé'
                                            : `Commandes fermées depuis le ${deadline}`}
                                </Text>
                                {!open && !isPast && (
                                    <Badge color="red" variant="light">Commandes fermées</Badge>
                                )}
                            </Group>

                            {!open && !isPast && (
                                <Alert
                                    icon={<IconAlertCircle size={16} />}
                                    color="orange"
                                    variant="light"
                                    mb="md"
                                >
                                    Les commandes pour ce jour sont fermées depuis le {deadline}.
                                </Alert>
                            )}

                            {menu.items.length === 0 ? (
                                <Text c="dimmed">Aucun plat disponible pour ce jour.</Text>
                            ) : (
                                <SimpleGrid
                                    cols={{ base: 1, sm: 2, md: 3 }}
                                    spacing="lg"
                                    style={{ opacity: isPast ? 0.5 : 1 }}
                                >
                                    {menu.items.map(item => (
                                        <MenuItemCard
                                            key={item.id}
                                            item={item}
                                            canOrder={open}
                                            onAdd={open ? (i) => handleAddItem(menu.id, menuDateStr, i) : undefined}
                                        />
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
