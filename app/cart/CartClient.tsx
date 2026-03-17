'use client';

import {
    Container, Title, Text, Button, Group, Stack, Card, Radio, Divider, Badge,
    Alert, Textarea, NumberInput, ActionIcon, Anchor, ThemeIcon
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { createOrderAction, getMenuDeliveryZoneAction } from '../order/actions';
import { Address } from '@prisma/client';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconAlertCircle, IconArrowLeft, IconShoppingCartOff, IconTrash, IconCheck, IconMapPinOff } from '@tabler/icons-react';
import { useCart } from '@/app/_components/CartContext';
import { pointInPolygon, type ZonePoint } from '@/lib/geo';

type Props = {
    addresses: Address[];
    containerBalance: number;
    userPhoneNumber: string | null;
    tupperwareEnabled: boolean;
};

type DeliveryZone = { name: string; polygon: ZonePoint[] } | null;

function isAddressInZone(addr: Address, zone: DeliveryZone): boolean {
    if (!zone) return true;
    const lat = (addr as any).lat as number | null;
    const lon = (addr as any).lon as number | null;
    if (!lat || !lon) return true; // Pas de coords → on laisse passer (ancienne adresse)
    return pointInPolygon(lat, lon, zone.polygon);
}

export default function CartClient({ addresses, containerBalance, tupperwareEnabled, userPhoneNumber }: Props) {
    const router = useRouter();
    const { cart, removeItem, clearCurrentCart, totalPrice } = useCart();
    const [loading, setLoading] = useState(false);
    const [packaging, setPackaging] = useState<'CARDBOARD' | 'TUPPERWARE'>('CARDBOARD');
    const [returnCount, setReturnCount] = useState(containerBalance > 0 ? containerBalance : 0);
    const [notes, setNotes] = useState('');
    const [timeConstraint, setTimeConstraint] = useState('');
    const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>(null);

    // Charger la zone du menu dès que le cart est connu
    useEffect(() => {
        if (!cart?.menuId) return;
        getMenuDeliveryZoneAction(cart.menuId).then(setDeliveryZone);
    }, [cart?.menuId]);

    // Pré-sélectionner la première adresse valide quand la zone est connue
    useEffect(() => {
        const firstValid = addresses.find(a => isAddressInZone(a, deliveryZone));
        setAddressId(firstValid?.id ?? (addresses[0]?.id ?? ''));
    }, [deliveryZone, addresses]);

    // Adresses valides vs hors zone
    const validAddresses = addresses.filter(a => isAddressInZone(a, deliveryZone));
    const hasAnyValidAddress = validAddresses.length > 0;

    // Sélectionner la première adresse valide par défaut
    const [addressId, setAddressId] = useState('');

    // Empty cart state
    if (!cart || cart.items.length === 0) {
        return (
            <Container size="sm" py="xl">
                <Stack align="center" gap="xl" py="xl">
                    <ThemeIcon size={80} radius={80} variant="light" color="gray">
                        <IconShoppingCartOff size={40} />
                    </ThemeIcon>
                    <Title order={2} ta="center">Votre panier est vide</Title>
                    <Text c="dimmed" ta="center">
                        Parcourez les menus de la semaine et ajoutez des plats à votre panier.
                    </Text>
                    <Button component={Link} href="/menu" size="md" leftSection={<IconArrowLeft size={16} />}>
                        Voir le menu
                    </Button>
                </Stack>
            </Container>
        );
    }

    const menuDateFormatted = dayjs(cart.menuDate).locale('fr').format('dddd D MMMM YYYY');

    const handleSubmit = async () => {
        setLoading(true);

        try {
            if (!userPhoneNumber) {
                notifications.show({
                    title: 'Profil incomplet',
                    message: 'Veuillez renseigner votre numéro de téléphone dans vos préférences.',
                    color: 'red',
                    autoClose: 5000
                });
                setLoading(false);
                setTimeout(() => router.push('/preferences'), 2000);
                return;
            }

            if (!addressId) {
                notifications.show({ title: 'Attention', message: 'Veuillez choisir une adresse de livraison', color: 'red' });
                setLoading(false);
                return;
            }

            const address = addresses.find(a => a.id === addressId);
            if (!address) { setLoading(false); return; }

            // @ts-ignore
            const fullAddress = `[${address.label}] ${address.content}${address.details ? `\n(Complément: ${address.details})` : ''}`;

            const items = cart.items.map(cartItem => ({
                id: cartItem.menuItemId,
                selectedOptions: cartItem.selectedOptionsRaw,
            }));

            const fullNotes = timeConstraint
                ? `${notes ? notes + '\n' : ''}⏰ Contrainte horaire : ${timeConstraint}`
                : notes;

            // @ts-ignore
            const res = await createOrderAction(cart.menuId, items, fullAddress, packaging, returnCount, fullNotes, undefined);

            if (res.success) {
                clearCurrentCart();
                notifications.show({ title: 'Commande validée !', message: 'Bon appétit ! 🍽️', color: 'green' });
                router.push('/orders');
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch (err) {
            console.error(err);
            notifications.show({ title: 'Erreur', message: 'Une erreur est survenue.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container size="sm" py="xl">
            <Group mb="xl" justify="space-between" align="center">
                <div>
                    <Title order={2}>Mon Panier</Title>
                    <Text size="sm" c="dimmed">{menuDateFormatted}</Text>
                </div>
                <Button
                    component={Link}
                    href="/menu"
                    variant="subtle"
                    leftSection={<IconArrowLeft size={16} />}
                >
                    Continuer mes achats
                </Button>
            </Group>

            <Stack gap="xl">
                {/* Cart items */}
                <Card withBorder radius="md">
                    <Title order={4} mb="md">1. Récapitulatif du panier</Title>
                    <Stack gap="sm">
                        {cart.items.map((cartItem, idx) => (
                            <div key={cartItem.cartId} style={{ borderBottom: idx < cart.items.length - 1 ? '1px solid #eee' : 'none', paddingBottom: 12 }}>
                                <Group justify="space-between" align="flex-start">
                                    <div style={{ flex: 1 }}>
                                        <Group gap="xs" mb={4}>
                                            <Text fw={500}>{cartItem.menuItemName}</Text>
                                        </Group>
                                        {cartItem.selectedOptions.length > 0 && (
                                            <Stack gap={2}>
                                                {cartItem.selectedOptions.map(opt => (
                                                    <Text key={opt.groupId} size="xs" c="dimmed">
                                                        {opt.groupName} : {opt.selectionLabels.join(', ')}
                                                    </Text>
                                                ))}
                                            </Stack>
                                        )}
                                    </div>
                                    <Group gap="sm" align="center">
                                        <Text fw={600}>{cartItem.totalPrice.toFixed(2)} €</Text>
                                        <ActionIcon
                                            color="red"
                                            variant="light"
                                            size="sm"
                                            onClick={() => removeItem(cartItem.cartId)}
                                            aria-label="Supprimer"
                                        >
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                            </div>
                        ))}
                    </Stack>

                    <Divider my="md" />
                    <Group justify="space-between">
                        <Text fw={700} size="lg">Total</Text>
                        <Text fw={700} size="lg" c="indigo">{totalPrice.toFixed(2)} €</Text>
                    </Group>
                    <Text size="xs" c="dimmed" mt={4}>Règlement sur place en wero, lydia ou cash</Text>
                </Card>

                {/* Packaging */}
                <Card withBorder radius="md">
                    <Title order={4} mb="md">2. Emballage</Title>
                    <Stack>
                        <Radio.Group
                            value={packaging}
                            onChange={(val) => setPackaging(val as any)}
                            label="Choisissez votre contenant"
                        >
                            <Stack mt="xs">
                                <Radio value="CARDBOARD" label="Carton (Jetable/Recyclable)" />
                                <Radio
                                    value="TUPPERWARE"
                                    label="Tupperware (Consigne à rendre - Stock limité)"
                                    disabled={!tupperwareEnabled}
                                    styles={!tupperwareEnabled ? {
                                        label: { color: '#adb5bd', cursor: 'not-allowed' },
                                        radio: { cursor: 'not-allowed' },
                                    } : {}}
                                />
                            </Stack>
                        </Radio.Group>

                        {!tupperwareEnabled && (
                            <Alert icon={<IconAlertCircle size={16} />} color="gray" title="Tupperware non disponible" variant="light">
                                <Text size="sm" c="dimmed">Le service Tupperware n'est pas disponible pour ce service.</Text>
                            </Alert>
                        )}

                        {tupperwareEnabled && packaging === 'TUPPERWARE' && (
                            <Alert icon={<IconAlertCircle size={16} />} color="blue" title="Fonctionnement Consigne">
                                En choisissant Tupperware, vous vous engagez à le restituer à la commande suivante.
                            </Alert>
                        )}

                        <Text fw={500} size="sm" mb={4}>Retour de contenants</Text>
                        {containerBalance > 0 ? (
                            <Stack gap="xs">
                                <Text size="sm">Vous avez actuellement <b>{containerBalance}</b> Tupperware(s) en votre possession.</Text>
                                <NumberInput
                                    label="Combien allez-vous en rendre à la livraison ?"
                                    description="Le coursier les récupérera lors de la livraison."
                                    min={0}
                                    max={containerBalance}
                                    value={returnCount}
                                    onChange={(val) => setReturnCount(Number(val))}
                                />
                            </Stack>
                        ) : (
                            <Text size="sm" c="dimmed">Vous n'avez aucun contenant à rendre.</Text>
                        )}
                    </Stack>
                </Card>

                {/* Address + time */}
                <Card withBorder radius="md">
                    <Title order={4} mb="md">3. Adresse et heure de livraison</Title>

                    <Alert icon={<IconAlertCircle size={16} />} color="blue" mb="md">
                        <Text size="sm">
                            La livraison est prévue <strong>entre 11h et 13h</strong>. Vous serez informé d'une heure plus précise ultérieurement.
                        </Text>
                        <Text size="sm" mt={4}>
                            Si vous avez un empêchement sur une partie de cette plage, merci de le préciser ci-dessous.
                        </Text>
                    </Alert>

                    <Textarea
                        label="Contrainte horaire (optionnel)"
                        placeholder="Ex : Indisponible avant 11h30, ou absent après 12h15..."
                        autosize
                        minRows={2}
                        mb="md"
                        value={timeConstraint}
                        onChange={(e) => setTimeConstraint(e.currentTarget.value)}
                    />

                    <Divider label="Adresse de livraison" labelPosition="left" mb="md" />

                    {addresses.length === 0 ? (
                        <Alert icon={<IconAlertCircle size={16} />} title="Aucune adresse" color="yellow">
                            Vous n'avez pas d'adresse enregistrée.{' '}
                            <Anchor component={Link} href="/preferences">Ajouter une adresse</Anchor>
                        </Alert>
                    ) : (
                        <>
                            {deliveryZone && !hasAnyValidAddress && (
                                <Alert icon={<IconMapPinOff size={16} />} color="red" mb="md"
                                    title={`Zone "${deliveryZone.name}" — Livraison impossible`}
                                >
                                    Aucune de vos adresses ne se trouve dans la zone de livraison de ce menu.
                                    Mettez à jour vos adresses dans vos{' '}
                                    <Anchor component={Link} href="/preferences">préférences</Anchor>.
                                </Alert>
                            )}
                            {/*{deliveryZone && hasAnyValidAddress && validAddresses.length < addresses.length && (
                                <Alert icon={<IconMapPinOff size={16} />} color="yellow" variant="light" mb="md">
                                    Certaines de vos adresses ne sont pas dans la zone de livraison et ont été désactivées.
                                    <Text size="sm" mt={4}>
                                        Adresse{validAddresses.length > 1 ? 's' : ''} disponible{validAddresses.length > 1 ? 's' : ''} : {validAddresses.map(a => a.content).join(', ')}
                                    </Text>
                                </Alert>
                            )}*/}
                            <Radio.Group value={addressId} onChange={setAddressId}>
                                <Stack>
                                    {addresses.map(addr => {
                                        const inZone = isAddressInZone(addr, deliveryZone);
                                        return (
                                            <Radio
                                                key={addr.id}
                                                value={addr.id}
                                                disabled={!inZone}
                                                // @ts-ignore
                                                label={
                                                    <Group gap="xs">
                                                        <Text size="sm" c={inZone ? undefined : 'dimmed'}>
                                                            {/* @ts-ignore */}
                                                            {addr.label} — {addr.content}{addr.details ? ` (${addr.details})` : ''}
                                                        </Text>
                                                        {!inZone && (
                                                            <Badge size="xs" color="orange" variant="light">
                                                                Hors zone
                                                            </Badge>
                                                        )}
                                                    </Group>
                                                }
                                            />
                                        );
                                    })}
                                </Stack>
                            </Radio.Group>
                        </>
                    )}
                </Card>

                {/* Notes */}
                <Card withBorder radius="md">
                    <Title order={4} mb="md">4. Informations complémentaires</Title>
                    <Textarea
                        label="Notes (optionnel)"
                        placeholder="Allergies, préférences, codes d'entrée..."
                        autosize
                        minRows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.currentTarget.value)}
                    />
                </Card>

                <Button
                    size="lg"
                    leftSection={<IconCheck size={20} />}
                    loading={loading}
                    disabled={addresses.length === 0 || cart.items.length === 0 || !hasAnyValidAddress}
                    onClick={handleSubmit}
                    variant="gradient"
                    gradient={{ from: 'indigo', to: 'cyan' }}
                >
                    {!hasAnyValidAddress && deliveryZone
                        ? `Livraison indisponible dans votre zone`
                        : `Valider la commande — ${totalPrice.toFixed(2)} €`}
                </Button>
            </Stack>
        </Container>
    );
}
