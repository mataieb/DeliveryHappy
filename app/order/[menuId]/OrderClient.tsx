'use client';

import { Container, Title, Text, Button, Checkbox, Group, Stack, Card, Radio, Divider, Badge, Alert, Textarea, Chip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createOrderAction } from '../actions';
import { MenuItem, Address, Menu } from '@prisma/client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconAlertCircle } from '@tabler/icons-react';

type Props = {
    menu: Menu & { items: MenuItem[] };
    addresses: Address[];
};

const DIETARY_LABELS: Record<string, string> = {
    'VEGETARIAN': 'Végétarien',
    'VEGAN': 'Végan',
    'HALAL': 'Halal',
    'GLUTEN_FREE': 'Sans Gluten',
    'SPICY': 'Épicé'
};

export default function OrderClient({ menu, addresses }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm({
        initialValues: {
            selectedItems: [] as string[],
            itemOptions: {} as Record<string, string>,
            addressId: addresses.length > 0 ? addresses[0].id : '',
            notes: '',
        },
        validate: {
            selectedItems: (val) => (val.length === 0 ? 'Veuillez choisir au moins un plat' : null),
            addressId: (val) => (val ? null : 'Veuillez choisir une adresse'),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        const address = addresses.find(a => a.id === values.addressId);
        if (!address) {
            setLoading(false);
            return;
        }

        // Format address for the order
        // @ts-ignore
        const fullAddress = `[${address.label}] ${address.content} ${address.details ? `\n(Complément: ${address.details})` : ''}`;

        // Build items array with options
        const items = values.selectedItems.map(id => ({
            id,
            option: values.itemOptions[id]
        }));

        const res = await createOrderAction(menu.id, items, fullAddress, values.notes, undefined);

        setLoading(false);
        if (res.success) {
            notifications.show({ title: 'Commande validée', message: 'Bon appétit !', color: 'green' });
            router.push('/menu'); // Redirect to home
        } else {
            notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
        }
    };

    const selectedTotal = menu.items
        .filter(item => form.values.selectedItems.includes(item.id))
        .reduce((sum, item) => sum + item.price, 0);

    return (
        <Container size="sm" py="xl">
            <Title mb="lg">Finaliser ma commande</Title>

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
                                                        {/* @ts-ignore */}
                                                        {item.ingredients && <Text size="xs" c="dimmed">{item.ingredients}</Text>}
                                                    </div>
                                                }
                                            />
                                            <Text fw={600}>{item.price} €</Text>
                                        </div>

                                        {/* Options diététiques par plat */}
                                        {item.dietaryOptions && item.dietaryOptions.length > 0 && form.values.selectedItems.includes(item.id) && (
                                            <div style={{ marginLeft: '32px', marginTop: '8px' }}>
                                                <Text size="xs" fw={500} mb={4}>Options disponibles :</Text>
                                                <Radio.Group
                                                    value={form.values.itemOptions[item.id] || ''}
                                                    onChange={(val) => form.setFieldValue(`itemOptions.${item.id}`, val)}
                                                >
                                                    <Group gap="xs">
                                                        {item.dietaryOptions.map(opt => (
                                                            <Radio
                                                                key={opt}
                                                                value={opt}
                                                                label={DIETARY_LABELS[opt] || opt}
                                                                size="xs"
                                                            />
                                                        ))}
                                                    </Group>
                                                </Radio.Group>
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
                        <Title order={4} mb="md">2. Adresse de livraison</Title>

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
                    </Card>

                    <Button size="lg" type="submit" loading={loading} disabled={addresses.length === 0}>
                        Valider la commande
                    </Button>
                </Stack>
            </form>
        </Container>
    )
}
