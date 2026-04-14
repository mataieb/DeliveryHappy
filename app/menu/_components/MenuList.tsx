"use client";

import { Menu, ItemCategory } from "@prisma/client";
import { SimpleGrid, Text, Group, Badge, Alert, Button, Modal, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import dayjs from "dayjs";
import 'dayjs/locale/fr';
import { useState } from "react";
import MenuItemCard, { MenuItemWithOptions, CATEGORY_CONFIG } from "./MenuItemCard";
import ItemOptionsModal from "./ItemOptionsModal";
import { isOrderingOpen, orderingDeadline } from "@/lib/ordering";
import { useCart } from "@/app/_components/CartContext";
import { CartItem, generateCartId } from "@/lib/cart";
import { IconAlertCircle, IconLock, IconMapPinOff } from "@tabler/icons-react";

interface MenuListProps {
    menus: (Menu & { items: MenuItemWithOptions[]; deliveryZone?: { name: string } | null })[];
    zoneStatusByMenuId: Record<string, 'blocked' | 'partial' | 'no_coords' | null>;
    validAddressLabelsByMenuId: Record<string, string[]>;
}

interface PendingSwitch {
    menuId: string;
    menuDate: string;
    cartItem: CartItem;
}

const DAY_SHORT: Record<string, string> = {
    lundi: 'Lun', mardi: 'Mar', mercredi: 'Mer', jeudi: 'Jeu', vendredi: 'Ven', samedi: 'Sam', dimanche: 'Dim',
};

const CATEGORY_ORDER: ItemCategory[] = ['STARTER', 'MAIN', 'DESSERT', 'DRINK'];

const SECTION_LABELS: Record<ItemCategory, string> = {
    STARTER: 'Entrées',
    MAIN: 'Plats',
    DESSERT: 'Desserts',
    DRINK: 'Boissons',
};

export default function MenuList({ menus, zoneStatusByMenuId, validAddressLabelsByMenuId }: MenuListProps) {
    const { cart, addItem, switchCart } = useCart();
    const [activeMenuId, setActiveMenuId] = useState<string>(menus[0]?.id ?? '');
    const [modalItem, setModalItem] = useState<MenuItemWithOptions | null>(null);
    const [pendingMenuId, setPendingMenuId] = useState<string | null>(null);
    const [pendingMenuDate, setPendingMenuDate] = useState<string | null>(null);
    const [pendingSwitch, setPendingSwitch] = useState<PendingSwitch | null>(null);
    const [optionsOpened, { open: openOptions, close: closeOptions }] = useDisclosure(false);
    const [switchOpened, { open: openSwitch, close: closeSwitch }] = useDisclosure(false);

    if (!menus || menus.length === 0) {
        return (
            <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                border: '2px dashed var(--mantine-color-gray-3)',
                borderRadius: 'var(--mantine-radius-lg)',
                background: 'var(--mantine-color-gray-0)',
            }}>
                <Text size="xl" fw={700} mb={12}>
                    Menus en cours d&apos;élaboration
                </Text>
                <Text size="sm" c="dimmed" mb={8} style={{ maxWidth: 440, margin: '0 auto' }}>
                    Les menus de la semaine sont en cours de préparation. Vous recevrez un e-mail dès que les commandes seront ouvertes.
                </Text>
            </div>
        );
    }

    const isPastDate = (date: Date) => dayjs(date).isBefore(dayjs().startOf('day'));
    const isLocked = (menu: MenuListProps['menus'][number]) => !!(menu as any).locked;
    const canOrder = (date: Date, locked: boolean) => !isPastDate(date) && isOrderingOpen(date) && !locked;

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
        if (item.optionGroups && item.optionGroups.length > 0) {
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

    const activeMenu = menus.find(m => m.id === activeMenuId) ?? menus[0];

    return (
        <>
            <ItemOptionsModal
                item={modalItem}
                opened={optionsOpened}
                onClose={() => { closeOptions(); setModalItem(null); }}
                onConfirm={handleModalConfirm}
            />

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

            {/* Sélecteur de jour style calendrier */}
            <Group gap="sm" mb="xl" wrap="nowrap" style={{ overflowX: 'auto', paddingBottom: 4 }}>
                {menus.map((menu) => {
                    const isPast = isPastDate(menu.date);
                    const isActive = menu.id === activeMenuId;
                    const cartCount = cart?.menuId === menu.id ? cart.items.length : 0;
                    const d = dayjs(menu.date).locale('fr');
                    const dayName = DAY_SHORT[d.format('dddd')] ?? d.format('ddd');
                    const dayNum = d.format('D');

                    return (
                        <button
                            key={menu.id}
                            onClick={() => setActiveMenuId(menu.id)}
                            style={{
                                flexShrink: 0,
                                width: 64,
                                padding: '10px 0',
                                borderRadius: 'var(--mantine-radius-lg)',
                                border: isActive ? '2px solid var(--mantine-color-indigo-5)' : '2px solid transparent',
                                background: isActive
                                    ? 'var(--mantine-color-indigo-6)'
                                    : isPast
                                        ? 'var(--mantine-color-gray-1)'
                                        : 'var(--mantine-color-gray-0)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 2,
                                position: 'relative',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <Text
                                size="xs"
                                fw={600}
                                style={{ color: isActive ? 'rgba(255,255,255,0.8)' : isPast ? 'var(--mantine-color-gray-5)' : 'var(--mantine-color-gray-6)' }}
                            >
                                {dayName}
                            </Text>
                            <Text
                                fw={800}
                                size="xl"
                                lh={1}
                                style={{ color: isActive ? 'white' : isPast ? 'var(--mantine-color-gray-5)' : 'var(--mantine-color-dark-6)' }}
                            >
                                {dayNum}
                            </Text>
                            {cartCount > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: 4,
                                    right: 4,
                                    background: 'var(--mantine-color-orange-5)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: 16,
                                    height: 16,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {cartCount}
                                </div>
                            )}
                        </button>
                    );
                })}
            </Group>

            {/* Contenu du jour actif */}
            {(() => {
                const menu = activeMenu;
                const isPast = isPastDate(menu.date);
                const locked = isLocked(menu);
                const open = canOrder(menu.date, locked);
                const deadline = orderingDeadline(menu.date);
                const menuDateStr = menu.date instanceof Date ? menu.date.toISOString() : String(menu.date);
                const zoneStatus = zoneStatusByMenuId[menu.id];
                const isZoneBlocked = zoneStatus === 'blocked';
                const isZonePartial = zoneStatus === 'partial';
                const validLabels = validAddressLabelsByMenuId[menu.id] ?? [];

                return (
                    <>
                        {/* Infos deadline */}
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

                        {locked && !isPast && (
                            <Alert icon={<IconLock size={16} />} color="red" variant="light" mb="md">
                                Les commandes pour ce jour ont été <strong>bloquées par l&apos;administrateur</strong>.
                            </Alert>
                        )}
                        {!open && !isPast && !locked && (
                            <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light" mb="md">
                                Les commandes pour ce jour sont fermées depuis le {deadline}.
                            </Alert>
                        )}
                        {isZoneBlocked && !isPast && (
                            <Alert icon={<IconMapPinOff size={16} />} color="orange" variant="light" mb="md">
                                La livraison n'est pas disponible dans votre zone pour ce jour.
                                Revenez un autre jour ou mettez à jour vos adresses dans vos <strong>préférences</strong>.
                            </Alert>
                        )}
                        {isZonePartial && !isPast && (
                            <Alert icon={<IconMapPinOff size={16} />} color="yellow" variant="light" mb="md">
                                Certaines de vos adresses ne sont pas dans la zone de livraison de ce jour.
                                {validLabels.length > 0 && (
                                    <Text size="sm" mt={4}>
                                        Adresse{validLabels.length > 1 ? 's' : ''} disponible{validLabels.length > 1 ? 's' : ''} : <strong>{validLabels.join(', ')}</strong>
                                    </Text>
                                )}
                            </Alert>
                        )}

                        {menu.items.length === 0 ? (
                            <div style={{
                                padding: '40px 20px',
                                textAlign: 'center',
                                border: '1px dashed var(--mantine-color-gray-3)',
                                borderRadius: 'var(--mantine-radius-md)',
                                background: 'var(--mantine-color-gray-0)',
                            }}>
                                <Text size="lg" fw={600} mb={8}>
                                    {isPast ? 'Menu passé' : 'Aucun plat disponible'}
                                </Text>
                                <Text size="sm" c="dimmed" mb={16}>
                                    {isPast
                                        ? 'Ce menu est déjà passé. Consultez les menus à venir.'
                                        : locked
                                            ? 'Les commandes pour ce jour ont été bloquées par l\'administrateur.'
                                            : open
                                                ? 'L\'administrateur n\'a pas encore créé de menu pour ce jour.'
                                                : 'Les commandes pour ce jour sont fermées. Commandez pour un autre jour.'}
                                </Text>
                                {!open && !isPast && (
                                    <Text size="sm" fw={500} c="dimmed">
                                        Deadline : {deadline}
                                    </Text>
                                )}
                            </div>
                        ) : (
                            <div style={{ opacity: isPast ? 0.5 : 1 }}>
                                {CATEGORY_ORDER
                                    .filter(cat => menu.items.some(item => item.category === cat))
                                    .map((cat, sectionIndex, visibleCats) => {
                                        const config = CATEGORY_CONFIG[cat];
                                        const catItems = menu.items.filter(item => item.category === cat);
                                        const isLast = sectionIndex === visibleCats.length - 1;
                                        return (
                                            <div key={cat} style={{ display: 'flex', gap: 16 }}>
                                                {/* Fil d'ariane */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
                                                    <div style={{
                                                        width: 40, height: 40,
                                                        borderRadius: '50%',
                                                        background: config.bg,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0,
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                                    }}>
                                                        {config.icon}
                                                    </div>
                                                    {!isLast && (
                                                        <div style={{
                                                            flex: 1,
                                                            width: 2,
                                                            background: 'var(--mantine-color-gray-3)',
                                                            minHeight: 20,
                                                            margin: '4px 0',
                                                        }} />
                                                    )}
                                                </div>
                                                {/* Contenu de la section */}
                                                <div style={{ flex: 1, paddingBottom: isLast ? 0 : 24 }}>
                                                    <Text fw={700} size="sm" mb="sm" style={{ color: config.bg, paddingTop: 8 }}>
                                                        {SECTION_LABELS[cat]}
                                                    </Text>
                                                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                                        {catItems.map(item => {
                                                            const itemBlocked = !!(item as any).blocked;
                                                            return (
                                                                <MenuItemCard
                                                                    key={item.id}
                                                                    item={item}
                                                                    canOrder={open && !isZoneBlocked}
                                                                    isBlocked={itemBlocked}
                                                                    onAdd={(open && !isZoneBlocked && !itemBlocked) ? (i) => handleAddItem(menu.id, menuDateStr, i) : undefined}
                                                                />
                                                            );
                                                        })}
                                                    </SimpleGrid>
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        )}
                    </>
                );
            })()}
        </>
    );
}
