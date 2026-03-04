'use client';

import { useState } from 'react';
import {
    Modal, Stack, Text, Button, Group, Radio, Checkbox, Divider, Badge, Alert
} from '@mantine/core';
import { IconAlertCircle, IconShoppingCart } from '@tabler/icons-react';
import { CartItem, CartItemOption, generateCartId } from '@/lib/cart';
import { ItemCategory } from '@prisma/client';

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

type MenuItemWithOptions = {
    id: string;
    name: string;
    price: number;
    category: ItemCategory;
    optionGroups: OptionGroup[];
};

interface ItemOptionsModalProps {
    item: MenuItemWithOptions | null;
    opened: boolean;
    onClose: () => void;
    onConfirm: (cartItem: CartItem) => void;
}

export default function ItemOptionsModal({ item, opened, onClose, onConfirm }: ItemOptionsModalProps) {
    const [selections, setSelections] = useState<Record<string, string | string[]>>({});
    const [error, setError] = useState<string | null>(null);

    if (!item) return null;

    const handleClose = () => {
        setSelections({});
        setError(null);
        onClose();
    };

    const handleConfirm = () => {
        setError(null);

        // Validate required groups
        for (const group of item.optionGroups) {
            if (group.isRequired) {
                const sel = selections[group.id];
                if (!sel || (Array.isArray(sel) && sel.length === 0)) {
                    setError(`Veuillez choisir une option pour : "${group.name}"`);
                    return;
                }
            }
        }

        // Build CartItemOption array + raw selections
        let optionPrice = 0;
        const selectedOptions: CartItemOption[] = [];
        const selectedOptionsRaw: Record<string, string | string[]> = {};

        for (const group of item.optionGroups) {
            const sel = selections[group.id];
            if (!sel || (Array.isArray(sel) && sel.length === 0)) continue;

            const optionIds = Array.isArray(sel) ? sel : [sel];
            const labels: string[] = [];
            let groupPrice = 0;

            for (const optId of optionIds) {
                const opt = group.options.find(o => o.id === optId);
                if (opt) {
                    labels.push(opt.name + (opt.price > 0 ? ` (+${opt.price}€)` : ''));
                    groupPrice += opt.price;
                }
            }
            optionPrice += groupPrice;
            selectedOptions.push({
                groupId: group.id,
                groupName: group.name,
                selection: sel,
                selectionLabels: labels,
                additionalPrice: groupPrice,
            });
            selectedOptionsRaw[group.id] = sel;
        }

        const cartItem: CartItem = {
            cartId: generateCartId(),
            menuItemId: item.id,
            menuItemName: item.name,
            menuItemCategory: item.category,
            basePrice: item.price,
            optionPrice,
            totalPrice: item.price + optionPrice,
            selectedOptions,
            selectedOptionsRaw: Object.keys(selectedOptionsRaw).length > 0 ? selectedOptionsRaw : undefined,
        };

        setSelections({});
        setError(null);
        onConfirm(cartItem);
    };

    // Calculate live price preview
    let previewPrice = item.price;
    for (const group of item.optionGroups) {
        const sel = selections[group.id];
        if (!sel) continue;
        const ids = Array.isArray(sel) ? sel : [sel];
        for (const optId of ids) {
            const opt = group.options.find(o => o.id === optId);
            if (opt) previewPrice += opt.price;
        }
    }

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap="xs">
                    <Text fw={700} size="lg">{item.name}</Text>
                    <Badge variant="light" color="blue">{previewPrice.toFixed(2)} €</Badge>
                </Group>
            }
            size="md"
            centered
        >
            <Stack gap="lg">
                {item.optionGroups.map(group => (
                    <div key={group.id}>
                        <Group gap="xs" mb="xs">
                            <Text size="sm" fw={600}>{group.name}</Text>
                            {group.isRequired && <Badge size="xs" color="red" variant="light">Requis</Badge>}
                            {group.allowMultiple && group.maxOptions && (
                                <Badge size="xs" color="gray" variant="outline">Max {group.maxOptions}</Badge>
                            )}
                        </Group>

                        {group.allowMultiple ? (
                            <Checkbox.Group
                                value={selections[group.id] as string[] || []}
                                onChange={(val) => {
                                    if (group.maxOptions && val.length > group.maxOptions) return;
                                    setSelections(prev => ({ ...prev, [group.id]: val }));
                                }}
                            >
                                <Stack gap="xs">
                                    {group.options.map(opt => (
                                        <Checkbox
                                            key={opt.id}
                                            value={opt.id}
                                            label={
                                                <div>
                                                    <Text size="sm">{opt.name}{opt.price > 0 && <b> (+{opt.price}€)</b>}</Text>
                                                    {opt.description && <Text size="xs" c="dimmed" fs="italic">{opt.description}</Text>}
                                                </div>
                                            }
                                        />
                                    ))}
                                </Stack>
                            </Checkbox.Group>
                        ) : (
                            <Radio.Group
                                value={selections[group.id] as string || ''}
                                onChange={(val) => setSelections(prev => ({ ...prev, [group.id]: val }))}
                            >
                                <Stack gap="xs">
                                    {group.options.map(opt => (
                                        <Radio
                                            key={opt.id}
                                            value={opt.id}
                                            label={
                                                <div>
                                                    <Text size="sm">{opt.name}{opt.price > 0 && <b> (+{opt.price}€)</b>}</Text>
                                                    {opt.description && <Text size="xs" c="dimmed" fs="italic">{opt.description}</Text>}
                                                </div>
                                            }
                                            onClick={() => {
                                                // Allow deselect if not required
                                                if (!group.isRequired && selections[group.id] === opt.id) {
                                                    setSelections(prev => {
                                                        const next = { ...prev };
                                                        delete next[group.id];
                                                        return next;
                                                    });
                                                }
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Radio.Group>
                        )}
                        <Divider mt="md" />
                    </div>
                ))}

                {error && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                        {error}
                    </Alert>
                )}

                <Group justify="space-between">
                    <Button variant="subtle" color="gray" onClick={handleClose}>Annuler</Button>
                    <Button
                        leftSection={<IconShoppingCart size={16} />}
                        onClick={handleConfirm}
                        variant="gradient"
                        gradient={{ from: 'indigo', to: 'cyan' }}
                    >
                        Ajouter — {previewPrice.toFixed(2)} €
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
