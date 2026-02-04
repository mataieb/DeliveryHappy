'use client';

import { Container, Title, Text, Button, Checkbox, Group, Stack, Card, Radio, Divider, Badge, Alert, Textarea, Chip, NumberInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createOrderAction } from '../actions';
import { MenuItem, Address, Menu } from '@prisma/client';
import { useState } from 'react';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconAlertCircle } from '@tabler/icons-react';

// Extended types to match the deep fetch
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
    menuItemId: string;
    options: OptionItem[];
};

type MenuItemWithOptions = MenuItem & {
    optionGroups: OptionGroup[];
    spiceLevel?: string | null;
};

type Props = {
    menu: Menu & { items: MenuItemWithOptions[] };
    addresses: Address[];
    containerBalance: number;
    userPhoneNumber: string | null;
}; // @ts-ignore

const DIETARY_LABELS: Record<string, string> = {
    'VEGETARIAN': 'Végétarien',
    'VEGAN': 'Végan',
    'HALAL': 'Halal',
    'GLUTEN_FREE': 'Sans Gluten',
    'SPICY': 'Épicé'
};

// @ts-ignore
export default function OrderClient({ menu, addresses, containerBalance, userPhoneNumber }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm({
        initialValues: {
            selectedItems: [] as string[],
            itemOptions: {} as Record<string, string>, // Legacy dietary options
            complexOptions: {} as Record<string, Record<string, string | string[]>>, // { itemId: { groupId: val } }
            addressId: addresses.length > 0 ? addresses[0].id : '',
            packaging: 'CARDBOARD' as 'CARDBOARD' | 'TUPPERWARE',
            returnCount: containerBalance > 0 ? containerBalance : 0,
            notes: '',
        },
        validate: {
            selectedItems: (val) => (val.length === 0 ? 'Veuillez choisir au moins un plat' : null),
            addressId: (val) => (val ? null : 'Veuillez choisir une adresse'),
            // Optional: Add validation for required option groups
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);

        if (!userPhoneNumber) {
            notifications.show({
                title: 'Profil incomplet',
                message: 'Veuillez renseigner votre numéro de téléphone dans vos préférences pour commander.',
                color: 'red',
                autoClose: 5000
            });
            setLoading(false);
            setTimeout(() => router.push('/preferences'), 2000);
            return;
        }

        const address = addresses.find(a => a.id === values.addressId);
        if (!address) {
            setLoading(false);
            return;
        }

        // Validate required groups
        for (const itemId of values.selectedItems) {
            const item = menu.items.find(i => i.id === itemId);
            if (!item) continue;
            for (const group of item.optionGroups) {
                if (group.isRequired) {
                    const selection = values.complexOptions[itemId]?.[group.id];
                    if (!selection || (Array.isArray(selection) && selection.length === 0)) {
                        notifications.show({ title: 'Attention', message: `Option requise pour ${item.name}: ${group.name}`, color: 'red' });
                        setLoading(false);
                        return;
                    }
                }
            }
        }

        // Format address for the order
        // @ts-ignore
        const fullAddress = `[${address.label}] ${address.content} ${address.details ? `\n(Complément: ${address.details})` : ''}`;

        // Build items array with options
        const items = values.selectedItems.map(id => ({
            id,
            option: values.itemOptions[id],
            selectedOptions: values.complexOptions[id]
        }));

        // @ts-ignore
        const res = await createOrderAction(menu.id, items, fullAddress, values.packaging, values.returnCount, values.notes, undefined);

        setLoading(false);
        if (res.success) {
            notifications.show({ title: 'Commande validée', message: 'Bon appétit !', color: 'green' });
            router.push('/menu'); // Redirect to home
        } else {
            notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
        }
    };

    // Calculate Total
    const selectedTotal = menu.items
        .filter(item => form.values.selectedItems.includes(item.id))
        .reduce((sum, item) => {
            let itemTotal = item.price;

            // Add options price
            // Legacy options have no price in this logic (assuming included)

            // Complex options
            const itemSelections = form.values.complexOptions[item.id];
            if (itemSelections) {
                item.optionGroups.forEach(group => {
                    const selection = itemSelections[group.id];
                    if (selection) {
                        const optionIds = Array.isArray(selection) ? selection : [selection];
                        optionIds.forEach(optId => {
                            const opt = group.options.find(o => o.id === optId);
                            if (opt) itemTotal += opt.price;
                        });
                    }
                });
            }

            return sum + itemTotal;
        }, 0);

    return (
        <Container size="sm" py="xl">
            <Title mb="lg">Finaliser ma commande du {dayjs(menu.date).format('DD/MM/YYYY')}</Title>

            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="xl">
                    <Card withBorder radius="md">
                        <Title order={4} mb="md">1. Choisissez vos plats & options</Title>
                        <Checkbox.Group {...form.getInputProps('selectedItems')}>
                            <Stack gap="lg">
                                {menu.items.map(item => (
                                    <div key={item.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <Checkbox
                                                value={item.id}
                                                label={
                                                    <div>
                                                        <Text fw={500}>{item.name}</Text>
                                                        <Group gap={4}>
                                                            {/* @ts-ignore */}
                                                            {item.ingredients && <Text size="xs" c="dimmed">{item.ingredients}</Text>}
                                                            {/* @ts-ignore */}
                                                            {(item.spiceLevel || item.dietaryOptions.includes('SPICY')) && (
                                                                <Badge variant="outline" color="red" size="xs">
                                                                    {item.spiceLevel === 'HOT' ? '🌶️🌶️🌶️ Très Épicé' :
                                                                        item.spiceLevel === 'MEDIUM' ? '🌶️🌶️ Épicé' :
                                                                            item.spiceLevel === 'MILD' ? '🌶️ Doux' :
                                                                                '🌶️ Au choix'}
                                                                </Badge>
                                                            )}
                                                        </Group>
                                                    </div>
                                                }
                                            />
                                            <Text fw={600}>{item.price} €</Text>
                                        </div>

                                        {/* Show Options ONLY if item is selected */}
                                        {form.values.selectedItems.includes(item.id) && (
                                            <div style={{ marginLeft: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                                                {/* Legacy Dietary Options - KEEPING FOR BACKWARD COMPATIBILITY but mostly superseded by Tags */}
                                                {item.dietaryOptions && item.dietaryOptions.length > 0 && item.dietaryOptions.some(d => d !== 'SPICY') && (
                                                    <Group gap="xs" mb="xs">
                                                        {item.dietaryOptions.filter(d => d !== 'SPICY').map(opt => (
                                                            <Badge key={opt} variant="dot" size="xs" color="gray">
                                                                {DIETARY_LABELS[opt] || opt}
                                                            </Badge>
                                                        ))}
                                                    </Group>
                                                )}

                                                {/* New Complex Option Groups */}
                                                {item.optionGroups.map(group => (
                                                    <div key={group.id}>
                                                        <Text size="sm" fw={500}>
                                                            {group.name}
                                                            {group.isRequired && <span style={{ color: 'red' }}> *</span>}
                                                            {group.maxOptions && group.allowMultiple && <span style={{ fontSize: '0.8em', color: 'gray' }}> (Max {group.maxOptions})</span>}
                                                        </Text>

                                                        {group.allowMultiple ? (
                                                            <Checkbox.Group
                                                                value={form.values.complexOptions[item.id]?.[group.id] as string[] || []}
                                                                onChange={(val) => {
                                                                    if (group.maxOptions && val.length > group.maxOptions) return; // Prevent selection
                                                                    const currentItemOptions = form.values.complexOptions[item.id] || {};
                                                                    form.setFieldValue(`complexOptions.${item.id}`, { ...currentItemOptions, [group.id]: val });
                                                                }}
                                                            >
                                                                <Stack gap="xs" mt="xs">
                                                                    {group.options.map(opt => (
                                                                        <Checkbox
                                                                            key={opt.id}
                                                                            value={opt.id}
                                                                            label={
                                                                                <div>
                                                                                    <Text size="sm">{opt.name} {opt.price > 0 && <b>(+{opt.price}€)</b>}</Text>
                                                                                    {opt.description && <Text size="xs" c="dimmed" fs="italic">{opt.description}</Text>}
                                                                                </div>
                                                                            }
                                                                            size="sm"
                                                                        />
                                                                    ))}
                                                                </Stack>
                                                            </Checkbox.Group>
                                                        ) : (
                                                            // RADIO GROUP (Single Choice)
                                                            <Radio.Group
                                                                value={form.values.complexOptions[item.id]?.[group.id] as string || ''}
                                                                onChange={(val) => {
                                                                    const currentItemOptions = form.values.complexOptions[item.id] || {};
                                                                    form.setFieldValue(`complexOptions.${item.id}`, { ...currentItemOptions, [group.id]: val });
                                                                }}
                                                            >
                                                                <Stack gap="xs" mt="xs">
                                                                    {group.options.map(opt => (
                                                                        <Radio
                                                                            key={opt.id}
                                                                            value={opt.id}
                                                                            label={
                                                                                <div>
                                                                                    <Text size="sm">{opt.name} {opt.price > 0 && <b>(+{opt.price}€)</b>}</Text>
                                                                                    {opt.description && <Text size="xs" c="dimmed" fs="italic">{opt.description}</Text>}
                                                                                </div>
                                                                            }
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                const currentVal = form.values.complexOptions[item.id]?.[group.id];
                                                                                if (!group.isRequired && currentVal === opt.id) {
                                                                                    const currentItemOptions = form.values.complexOptions[item.id] || {};
                                                                                    const newOptions = { ...currentItemOptions };
                                                                                    delete newOptions[group.id];
                                                                                    // setTimeout to avoid conflict with onChange if any
                                                                                    setTimeout(() => form.setFieldValue(`complexOptions.${item.id}`, newOptions), 0);
                                                                                }
                                                                            }}
                                                                        />
                                                                    ))}
                                                                </Stack>
                                                            </Radio.Group>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </Stack>
                        </Checkbox.Group>
                        {form.errors.selectedItems && <Text c="red" size="sm" mt="xs">{form.errors.selectedItems}</Text>}

                        {/* Notes globales */}
                        <Divider my="md" />
                        <Textarea
                            label="Informations complémentaires"
                            placeholder="Allergies, préférences de cuisson, codes d'entrée..."
                            autosize
                            minRows={2}
                            {...form.getInputProps('notes')}
                        />
                    </Card>



                    <Card withBorder radius="md">
                        <Title order={4} mb="md">2. Emballage</Title>
                        <Stack>
                            <Radio.Group
                                value={form.values.packaging}
                                onChange={(val) => form.setFieldValue('packaging', val as any)}
                                label="Choisissez votre contenant"
                            >
                                <Stack mt="xs">
                                    <Radio value="CARDBOARD" label="Carton (Jetable/Recyclable)" />
                                    <Radio value="TUPPERWARE" label="Tupperware (Consigne à rendre - Stock limité)" />
                                </Stack>
                            </Radio.Group>

                            {(form.values.packaging === 'TUPPERWARE') && (
                                <Alert icon={<IconAlertCircle size={16} />} color="blue" title="Fonctionnement Consigne">
                                    En choisissant Tupperware, vous vous engagez à le restituer à la commande suivante.
                                </Alert>
                            )}

                            <Divider />

                            <Divider />

                            <Text fw={500} size="sm" mb={4}>Retour de contenants</Text>
                            {containerBalance > 0 ? (
                                <Stack gap="xs">
                                    <Text size="sm">Vous avez actuellement <b>{containerBalance}</b> Tupperware(s) en votre possession.</Text>
                                    <NumberInput
                                        label="Combien allez-vous en rendre à la livraison ?"
                                        description="Le coursier les récupérera lors de la livraison."
                                        min={0}
                                        max={containerBalance}
                                        value={form.values.returnCount}
                                        onChange={(val) => form.setFieldValue('returnCount', Number(val))}
                                    />
                                </Stack>
                            ) : (
                                <Text size="sm" c="dimmed">Vous n'avez aucun contenant à rendre.</Text>
                            )}
                        </Stack>
                    </Card>

                    <Card withBorder radius="md">
                        <Title order={4} mb="md">3. Adresse de livraison</Title>

                        {addresses.length === 0 ? (
                            <Alert icon={<IconAlertCircle size={16} />} title="Aucune adresse" color="yellow">
                                Vous n'avez pas d'adresse enregistrée.
                                <br />
                                <Link href="/preferences" style={{ textDecoration: 'underline' }}>
                                    Ajouter une adresse dans mes préférences
                                </Link>
                            </Alert>
                        ) : (
                            <Radio.Group {...form.getInputProps('addressId')}>
                                <Stack>
                                    {addresses.map(addr => (
                                        <Radio
                                            key={addr.id}
                                            value={addr.id}
                                            // @ts-ignore
                                            label={`${addr.label} - ${addr.content} ${addr.details ? `(${addr.details})` : ''}`}
                                        />
                                    ))}
                                </Stack>
                            </Radio.Group>
                        )}
                        {form.errors.addressId && <Text c="red" size="sm" mt="xs">{form.errors.addressId}</Text>}
                    </Card>

                    <Card withBorder radius="md" bg="gray.0">
                        <Group justify="space-between">
                            <Text size="xl" fw={700}>Total</Text>
                            <Text size="xl" fw={700} c="blue">{selectedTotal.toFixed(2)} €</Text>
                        </Group>
                        <Text size="sm" c="dimmed" mt="xs" ta="center">Règlement sur place en wero, lydia ou cash</Text>
                    </Card>

                    <Button size="lg" type="submit" loading={loading} disabled={addresses.length === 0}>
                        Valider la commande
                    </Button>
                </Stack >
            </form >
        </Container >
    )
}
