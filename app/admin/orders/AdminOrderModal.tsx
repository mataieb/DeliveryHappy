'use client';

import {
    Modal, Stack, Select, Checkbox, Radio, Textarea, Button, Group, Text,
    Divider, Loader, Box, ScrollArea
} from "@mantine/core";
import { useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { adminCreateOrderAction, adminUpdateOrderItemsAction, getAdminOrderDataAction } from "./actions";

type User = { id: string; name: string | null; email: string; addresses: { content: string }[] };
type OptionItem = { id: string; name: string; price: number };
type OptionGroup = { id: string; name: string; isRequired: boolean; allowMultiple: boolean; options: OptionItem[] };
type MenuItem = { id: string; name: string; price: number; category: string; optionGroups: OptionGroup[] };
type Menu = { id: string; date: Date | string; items: MenuItem[] };

type EditOrder = {
    id: string;
    userId: string;
    menuId: string;
    deliveryAddress: string;
    packaging: 'CARDBOARD' | 'TUPPERWARE';
    notes?: string | null;
    items: { itemId: string; selectedOptions?: Record<string, any> | null }[];
};

type Props = {
    opened: boolean;
    onClose: () => void;
    editOrder?: EditOrder;
};

export function AdminOrderModal({ opened, onClose, editOrder }: Props) {
    const isEdit = !!editOrder;

    const [data, setData] = useState<{ users: User[]; menus: Menu[] } | null>(null);
    const [loadingData, setLoadingData] = useState(false);

    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedMenuId, setSelectedMenuId] = useState('');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [itemOptions, setItemOptions] = useState<Record<string, Record<string, string | string[]>>>({});
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [packaging, setPackaging] = useState<'CARDBOARD' | 'TUPPERWARE'>('CARDBOARD');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!opened) return;

        setLoadingData(true);
        getAdminOrderDataAction().then(res => {
            if (res.success) {
                setData({ users: res.users as User[], menus: res.menus as Menu[] });
            }
            setLoadingData(false);
        });

        if (editOrder) {
            setSelectedUserId(editOrder.userId);
            setSelectedMenuId(editOrder.menuId);
            setSelectedItems(editOrder.items.map(i => i.itemId));
            setItemOptions(Object.fromEntries(
                editOrder.items
                    .filter(i => i.selectedOptions)
                    .map(i => [i.itemId, i.selectedOptions as Record<string, string | string[]>])
            ));
            setDeliveryAddress(editOrder.deliveryAddress);
            setPackaging(editOrder.packaging);
            setNotes(editOrder.notes || '');
        } else {
            setSelectedUserId('');
            setSelectedMenuId('');
            setSelectedItems([]);
            setItemOptions({});
            setDeliveryAddress('');
            setPackaging('CARDBOARD');
            setNotes('');
        }
    }, [opened]);

    const selectedMenu = data?.menus.find(m => m.id === selectedMenuId);

    const handleItemToggle = (itemId: string, checked: boolean) => {
        if (checked) {
            setSelectedItems(prev => [...prev, itemId]);
        } else {
            setSelectedItems(prev => prev.filter(id => id !== itemId));
            setItemOptions(prev => { const n = { ...prev }; delete n[itemId]; return n; });
        }
    };

    const handleOptionChange = (itemId: string, groupId: string, value: string | string[]) => {
        setItemOptions(prev => ({
            ...prev,
            [itemId]: { ...(prev[itemId] || {}), [groupId]: value }
        }));
    };

    const handleSubmit = async () => {
        if (!isEdit && !selectedUserId) {
            notifications.show({ message: "Sélectionner un utilisateur", color: "red" }); return;
        }
        if (!selectedMenuId) {
            notifications.show({ message: "Sélectionner un menu", color: "red" }); return;
        }
        if (selectedItems.length === 0) {
            notifications.show({ message: "Sélectionner au moins un plat", color: "red" }); return;
        }
        if (!deliveryAddress) {
            notifications.show({ message: "Adresse requise", color: "red" }); return;
        }

        const items = selectedItems.map(id => ({
            id,
            selectedOptions: itemOptions[id] && Object.keys(itemOptions[id]).length > 0
                ? itemOptions[id]
                : undefined
        }));

        setSubmitting(true);
        try {
            const res = isEdit
                ? await adminUpdateOrderItemsAction(editOrder!.id, items, deliveryAddress, packaging, notes || undefined)
                : await adminCreateOrderAction(selectedUserId, selectedMenuId, items, deliveryAddress, packaging, notes || undefined);

            if (res.success) {
                notifications.show({ message: isEdit ? "Commande modifiée" : "Commande créée", color: "green" });
                onClose();
            } else {
                notifications.show({ message: res.error, color: "red" });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={isEdit ? "Modifier la commande" : "Nouvelle commande (admin)"}
            size="lg"
            scrollAreaComponent={ScrollArea.Autosize}
        >
            {loadingData ? (
                <Group justify="center" py="xl"><Loader /></Group>
            ) : (
                <Stack>
                    {!isEdit && (
                        <>
                            <Select
                                label="Utilisateur"
                                placeholder="Rechercher un utilisateur..."
                                searchable
                                required
                                data={data?.users.map(u => ({
                                    value: u.id,
                                    label: u.name ? `${u.name} (${u.email})` : u.email
                                })) || []}
                                value={selectedUserId || null}
                                onChange={(v) => {
                                    setSelectedUserId(v || '');
                                    setDeliveryAddress('');
                                }}
                            />
                            <Select
                                label="Menu"
                                placeholder="Sélectionner un menu..."
                                required
                                data={data?.menus.map(m => ({
                                    value: m.id,
                                    label: new Date(m.date).toLocaleDateString('fr-FR', {
                                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                    })
                                })) || []}
                                value={selectedMenuId || null}
                                onChange={(v) => {
                                    setSelectedMenuId(v || '');
                                    setSelectedItems([]);
                                    setItemOptions({});
                                }}
                            />
                        </>
                    )}

                    {selectedMenu && (
                        <>
                            <Divider label="Plats" labelPosition="left" />
                            <Stack gap="sm">
                                {selectedMenu.items.map(item => (
                                    <Stack key={item.id} gap="xs">
                                        <Checkbox
                                            label={
                                                <Text size="sm">
                                                    <b>{item.name}</b> — {item.price.toFixed(2)} €
                                                </Text>
                                            }
                                            checked={selectedItems.includes(item.id)}
                                            onChange={(e) => handleItemToggle(item.id, e.currentTarget.checked)}
                                        />
                                        {selectedItems.includes(item.id) && item.optionGroups.length > 0 && (
                                            <Box ml="xl">
                                                {item.optionGroups.map(group => (
                                                    <Box key={group.id} mb="xs">
                                                        {group.allowMultiple ? (
                                                            <Checkbox.Group
                                                                label={
                                                                    <Text size="xs" fw={500}>
                                                                        {group.name}{group.isRequired ? ' *' : ''}
                                                                    </Text>
                                                                }
                                                                value={
                                                                    Array.isArray(itemOptions[item.id]?.[group.id])
                                                                        ? itemOptions[item.id][group.id] as string[]
                                                                        : []
                                                                }
                                                                onChange={(v) => handleOptionChange(item.id, group.id, v)}
                                                            >
                                                                <Stack gap={4} mt={4}>
                                                                    {group.options.map(opt => (
                                                                        <Checkbox
                                                                            key={opt.id}
                                                                            value={opt.id}
                                                                            size="xs"
                                                                            label={`${opt.name}${opt.price > 0 ? ` (+${opt.price.toFixed(2)} €)` : ''}`}
                                                                        />
                                                                    ))}
                                                                </Stack>
                                                            </Checkbox.Group>
                                                        ) : (
                                                            <Radio.Group
                                                                label={
                                                                    <Text size="xs" fw={500}>
                                                                        {group.name}{group.isRequired ? ' *' : ''}
                                                                    </Text>
                                                                }
                                                                value={
                                                                    typeof itemOptions[item.id]?.[group.id] === 'string'
                                                                        ? itemOptions[item.id][group.id] as string
                                                                        : ''
                                                                }
                                                                onChange={(v) => handleOptionChange(item.id, group.id, v)}
                                                            >
                                                                <Stack gap={4} mt={4}>
                                                                    {group.options.map(opt => (
                                                                        <Radio
                                                                            key={opt.id}
                                                                            value={opt.id}
                                                                            size="xs"
                                                                            label={`${opt.name}${opt.price > 0 ? ` (+${opt.price.toFixed(2)} €)` : ''}`}
                                                                        />
                                                                    ))}
                                                                </Stack>
                                                            </Radio.Group>
                                                        )}
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}
                                    </Stack>
                                ))}
                            </Stack>
                        </>
                    )}

                    <Divider label="Livraison" labelPosition="left" />

                    {!isEdit && selectedUserId && (() => {
                        const userAddresses = data?.users.find(u => u.id === selectedUserId)?.addresses || [];
                        if (userAddresses.length === 0) return null;
                        return (
                            <Select
                                label="Adresses enregistrées"
                                placeholder="Choisir une adresse..."
                                data={userAddresses.map(a => ({ value: a.content, label: a.content }))}
                                value={deliveryAddress || null}
                                onChange={(v) => setDeliveryAddress(v || '')}
                                clearable
                            />
                        );
                    })()}

                    <Textarea
                        label="Adresse de livraison"
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.currentTarget.value)}
                        autosize
                        minRows={2}
                        placeholder="Saisir ou sélectionner ci-dessus..."
                    />

                    <Radio.Group
                        label="Emballage"
                        value={packaging}
                        onChange={(v) => setPackaging(v as 'CARDBOARD' | 'TUPPERWARE')}
                    >
                        <Group mt={4}>
                            <Radio value="CARDBOARD" label="Carton" />
                            <Radio value="TUPPERWARE" label="Tupperware" />
                        </Group>
                    </Radio.Group>

                    <Textarea
                        label="Notes"
                        value={notes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                        placeholder="Notes spéciales..."
                        autosize
                        minRows={2}
                    />

                    <Button onClick={handleSubmit} loading={submitting} fullWidth mt="sm">
                        {isEdit ? "Mettre à jour la commande" : "Créer la commande"}
                    </Button>
                </Stack>
            )}
        </Modal>
    );
}
