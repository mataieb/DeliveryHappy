'use client';

import {
    Container, Title, Text, Button, Group, Stack, Card, Radio, Divider, Badge,
    Alert, Textarea, NumberInput, ActionIcon, Anchor, ThemeIcon, Stepper,
    TextInput, Combobox, useCombobox, Loader, SegmentedControl, Collapse,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { createOrderAction, getMenuDeliveryZoneAction } from '../order/actions';
import { addAddressAction } from '../preferences/actions';
import { Address, AddressType } from '@prisma/client';
import { useState, useEffect, useRef } from 'react';
import { useForm } from '@mantine/form';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    IconAlertCircle, IconArrowLeft, IconShoppingCartOff, IconTrash, IconCheck,
    IconMapPinOff, IconPlus, IconArrowRight, IconCreditCard,
} from '@tabler/icons-react';
import { useCart } from '@/app/_components/CartContext';
import { pointInPolygon, type ZonePoint } from '@/lib/geo';

const BAN_URL = 'https://api-adresse.data.gouv.fr/search/';

type BanFeature = {
    properties: { id: string; label: string; postcode: string; city: string };
    geometry: { coordinates: [number, number] };
};

async function fetchBanSuggestions(query: string): Promise<BanFeature[]> {
    if (query.trim().length < 3) return [];
    const params = new URLSearchParams({ q: query, limit: '6', autocomplete: '1' });
    const res = await fetch(`${BAN_URL}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.features ?? [];
}

type Props = {
    addresses: Address[];
    containerBalance: number;
    userPhoneNumber: string | null;
    tupperwareEnabled: boolean;
    defaultPackaging?: 'CARDBOARD' | 'TUPPERWARE';
};

type DeliveryZone = { name: string; polygon: ZonePoint[] } | null;

function isAddressInZone(addr: Address, zone: DeliveryZone): boolean {
    if (!zone) return true;
    const lat = (addr as any).lat as number | null;
    const lon = (addr as any).lon as number | null;
    if (!lat || !lon) return true;
    return pointInPolygon(lat, lon, zone.polygon);
}

export default function CartClient({ addresses: initialAddresses, containerBalance, tupperwareEnabled, userPhoneNumber, defaultPackaging = 'CARDBOARD' }: Props) {
    const router = useRouter();
    const { cart, removeItem, clearCurrentCart, totalPrice } = useCart();

    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Step 0 — Récap + notes
    const [notes, setNotes] = useState('');
    const [timeConstraint, setTimeConstraint] = useState('');

    // Step 1 — Adresse + contenant
    const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
    const [addressId, setAddressId] = useState('');
    const [packaging, setPackaging] = useState<'CARDBOARD' | 'TUPPERWARE'>(defaultPackaging);
    const [returnCount, setReturnCount] = useState(containerBalance > 0 ? containerBalance : 0);
    const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>(null);

    // Inline add address
    const [addAddrOpened, { toggle: toggleAddAddr, close: closeAddAddr }] = useDisclosure(false);
    const [addAddrLoading, setAddAddrLoading] = useState(false);
    const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });
    const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [addrCoords, setAddrCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [hasSelectedFromDropdown, setHasSelectedFromDropdown] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const addrForm = useForm({
        initialValues: { label: '', type: 'DOMICILE' as AddressType, content: '', details: '' },
        validate: {
            label: (v) => (v.length < 2 ? 'Nom trop court' : null),
            content: (v) => (v.length < 5 ? 'Adresse trop courte' : null),
        },
    });

    const [debouncedContent] = useDebouncedValue(addrForm.values.content, 300);

    useEffect(() => {
        if (hasSelectedFromDropdown) return;
        if (debouncedContent.trim().length < 3) { setSuggestions([]); combobox.closeDropdown(); return; }
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setLoadingSuggestions(true);
        fetchBanSuggestions(debouncedContent).then(results => {
            setSuggestions(results);
            setLoadingSuggestions(false);
            if (results.length > 0) combobox.openDropdown(); else combobox.closeDropdown();
        });
    }, [debouncedContent]);

    useEffect(() => {
        if (!cart?.menuId) return;
        getMenuDeliveryZoneAction(cart.menuId).then(setDeliveryZone);
    }, [cart?.menuId]);

    useEffect(() => {
        const firstValid = addresses.find(a => isAddressInZone(a, deliveryZone));
        setAddressId(firstValid?.id ?? (addresses[0]?.id ?? ''));
    }, [deliveryZone, addresses]);

    const validAddresses = addresses.filter(a => isAddressInZone(a, deliveryZone));
    const hasAnyValidAddress = validAddresses.length > 0;

    // Empty cart
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

    const handleAddAddress = async (values: typeof addrForm.values) => {
        setAddAddrLoading(true);
        try {
            const res = await addAddressAction(values.label, values.content, values.details, addrCoords?.lat, addrCoords?.lon, values.type);
            if (res.success && res.address) {
                setAddresses(prev => [...prev, res.address as Address]);
                setAddressId(res.address.id);
                notifications.show({ title: 'Adresse ajoutée', message: 'Elle a été enregistrée dans votre profil.', color: 'green' });
                addrForm.reset();
                setAddrCoords(null);
                setSuggestions([]);
                setHasSelectedFromDropdown(false);
                closeAddAddr();
            } else {
                notifications.show({ title: 'Erreur', message: (res as any).error ?? 'Erreur inconnue', color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'ajout', color: 'red' });
        } finally {
            setAddAddrLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (!userPhoneNumber) {
                notifications.show({ title: 'Profil incomplet', message: 'Renseignez votre téléphone dans vos préférences.', color: 'red' });
                setTimeout(() => router.push('/preferences'), 2000);
                return;
            }
            if (!addressId) {
                notifications.show({ title: 'Attention', message: 'Choisissez une adresse de livraison', color: 'red' });
                return;
            }
            const address = addresses.find(a => a.id === addressId);
            if (!address) return;

            const fullAddress = `[${address.label}] ${address.content}${(address as any).details ? `\n(Complément: ${(address as any).details})` : ''}`;
            const items = cart.items.map(ci => ({ id: ci.menuItemId, selectedOptions: ci.selectedOptionsRaw }));
            const fullNotes = timeConstraint ? `${notes ? notes + '\n' : ''}⏰ Contrainte horaire : ${timeConstraint}` : notes;

            const res = await createOrderAction(cart.menuId, items, fullAddress, packaging, returnCount, fullNotes, undefined);

            if (res.success) {
                clearCurrentCart();
                router.push('/cart/confirmation');
            } else {
                notifications.show({ title: 'Erreur', message: (res as any).error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Une erreur est survenue.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const canAdvanceStep0 = cart.items.length > 0;
    const canAdvanceStep1 = !!addressId && hasAnyValidAddress;

    return (
        <Container size="sm" py="xl">
            <Group mb="xl" justify="space-between" align="center">
                <div>
                    <Title order={2}>Mon Panier</Title>
                    <Text size="sm" c="dimmed" style={{ textTransform: 'capitalize' }}>{menuDateFormatted}</Text>
                </div>
                <Button component={Link} href="/menu" variant="subtle" leftSection={<IconArrowLeft size={16} />}>
                    Continuer mes achats
                </Button>
            </Group>

            <Stepper active={activeStep} mb="xl" size="sm">
                <Stepper.Step label="Récapitulatif" />
                <Stepper.Step label="Livraison" />
                <Stepper.Step label="Paiement" />
            </Stepper>

            {/* ── STEP 0 : Récap + notes ── */}
            {activeStep === 0 && (
                <Stack gap="lg">
                    <Card withBorder radius="md">
                        <Title order={4} mb="md">Récapitulatif</Title>
                        <Stack gap="sm">
                            {cart.items.map((cartItem, idx) => (
                                <div key={cartItem.cartId} style={{ borderBottom: idx < cart.items.length - 1 ? '1px solid #eee' : 'none', paddingBottom: 12 }}>
                                    <Group justify="space-between" align="flex-start">
                                        <div style={{ flex: 1 }}>
                                            <Text fw={500}>{cartItem.menuItemName}</Text>
                                            {cartItem.selectedOptions.length > 0 && (
                                                <Stack gap={2} mt={2}>
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
                                            <ActionIcon color="red" variant="light" size="sm" onClick={() => removeItem(cartItem.cartId)}>
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

                    <Card withBorder radius="md">
                        <Title order={4} mb="md">Informations complémentaires</Title>
                        <Textarea
                            label="Notes (optionnel)"
                            placeholder="Allergies, préférences particulières..."
                            autosize
                            minRows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.currentTarget.value)}
                        />
                    </Card>

                    <Group justify="flex-end">
                        <Button
                            rightSection={<IconArrowRight size={16} />}
                            disabled={!canAdvanceStep0}
                            onClick={() => setActiveStep(1)}
                        >
                            Suivant
                        </Button>
                    </Group>
                </Stack>
            )}

            {/* ── STEP 1 : Adresse + contenant ── */}
            {activeStep === 1 && (
                <Stack gap="lg">
                    <Card withBorder radius="md">
                        <Title order={4} mb="md">Adresse de livraison</Title>

                        {deliveryZone && !hasAnyValidAddress && (
                            <Alert icon={<IconMapPinOff size={16} />} color="red" mb="md" title={`Zone "${deliveryZone.name}" — Livraison impossible`}>
                                Aucune adresse dans la zone de livraison.
                            </Alert>
                        )}

                        {addresses.length === 0 ? (
                            <Alert icon={<IconAlertCircle size={16} />} color="yellow" mb="md">
                                Aucune adresse enregistrée. Ajoutez-en une ci-dessous.
                            </Alert>
                        ) : (
                            <Radio.Group value={addressId} onChange={setAddressId} mb="md">
                                <Stack>
                                    {addresses.map(addr => {
                                        const inZone = isAddressInZone(addr, deliveryZone);
                                        return (
                                            <Radio
                                                key={addr.id}
                                                value={addr.id}
                                                disabled={!inZone}
                                                label={
                                                    <Group gap="xs">
                                                        <Text size="sm" c={inZone ? undefined : 'dimmed'}>
                                                            {addr.label} — {addr.content}{(addr as any).details ? ` (${(addr as any).details})` : ''}
                                                        </Text>
                                                        {!inZone && <Badge size="xs" color="orange" variant="light">Hors zone</Badge>}
                                                    </Group>
                                                }
                                            />
                                        );
                                    })}
                                </Stack>
                            </Radio.Group>
                        )}

                        <Button
                            variant="subtle"
                            size="xs"
                            leftSection={<IconPlus size={14} />}
                            onClick={toggleAddAddr}
                        >
                            {addAddrOpened ? 'Annuler' : 'Ajouter une adresse'}
                        </Button>

                        <Collapse in={addAddrOpened} mt="md">
                            <form onSubmit={addrForm.onSubmit(handleAddAddress)}>
                                <Stack gap="sm">
                                    <SegmentedControl
                                        data={[
                                            { label: '🏠 Domicile', value: 'DOMICILE' },
                                            { label: '🏢 Bureau', value: 'BUREAU' },
                                        ]}
                                        {...addrForm.getInputProps('type')}
                                    />
                                    <TextInput
                                        label="Nom"
                                        placeholder="Chez moi, Bureau..."
                                        withAsterisk
                                        {...addrForm.getInputProps('label')}
                                    />
                                    <Combobox store={combobox} onOptionSubmit={() => {}}>
                                        <Combobox.Target>
                                            <TextInput
                                                label="Adresse"
                                                placeholder="32 rue de Rivoli, Paris..."
                                                withAsterisk
                                                rightSection={loadingSuggestions ? <Loader size="xs" /> : null}
                                                {...addrForm.getInputProps('content')}
                                                onChange={(e) => {
                                                    addrForm.setFieldValue('content', e.currentTarget.value);
                                                    setHasSelectedFromDropdown(false);
                                                    setAddrCoords(null);
                                                }}
                                                onFocus={() => { if (suggestions.length > 0) combobox.openDropdown(); }}
                                                onBlur={() => combobox.closeDropdown()}
                                            />
                                        </Combobox.Target>
                                        <Combobox.Dropdown>
                                            <Combobox.Options>
                                                {suggestions.map(f => (
                                                    <Combobox.Option
                                                        key={f.properties.id}
                                                        value={f.properties.label}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            const [lon, lat] = f.geometry.coordinates;
                                                            addrForm.setFieldValue('content', f.properties.label);
                                                            setAddrCoords({ lat, lon });
                                                            setHasSelectedFromDropdown(true);
                                                            setSuggestions([]);
                                                            combobox.closeDropdown();
                                                        }}
                                                    >
                                                        {f.properties.label}
                                                    </Combobox.Option>
                                                ))}
                                            </Combobox.Options>
                                        </Combobox.Dropdown>
                                    </Combobox>
                                    <TextInput
                                        label="Complément"
                                        placeholder="Code: 1234, Étage..."
                                        {...addrForm.getInputProps('details')}
                                    />
                                    <Group justify="flex-end">
                                        <Button type="submit" size="xs" loading={addAddrLoading} leftSection={<IconCheck size={14} />}>
                                            Enregistrer
                                        </Button>
                                    </Group>
                                </Stack>
                            </form>
                        </Collapse>
                    </Card>

                    <Card withBorder radius="md">
                        <Title order={4} mb="md">Contrainte horaire</Title>
                        <Textarea
                            label="Indisponibilité sur le créneau 11h–13h (optionnel)"
                            placeholder="Ex : Indisponible avant 11h30, absent après 12h15..."
                            autosize
                            minRows={2}
                            value={timeConstraint}
                            onChange={(e) => setTimeConstraint(e.currentTarget.value)}
                        />
                    </Card>

                    <Card withBorder radius="md">
                        <Title order={4} mb="md">Contenant</Title>
                        <Radio.Group value={packaging} onChange={(v) => setPackaging(v as any)} label="Choisissez votre emballage" mb="md">
                            <Stack mt="xs">
                                <Radio value="CARDBOARD" label="Carton (jetable / recyclable)" />
                                <Radio
                                    value="TUPPERWARE"
                                    label="Tupperware (consigné)"
                                    disabled={!tupperwareEnabled}
                                />
                            </Stack>
                        </Radio.Group>

                        {!tupperwareEnabled && (
                            <Alert icon={<IconAlertCircle size={16} />} color="gray" variant="light" mb="sm">
                                <Text size="sm">Tupperware non disponible pour ce service.</Text>
                            </Alert>
                        )}

                        {tupperwareEnabled && packaging === 'TUPPERWARE' && (
                            <Alert icon={<IconAlertCircle size={16} />} color="orange" mb="sm" title="Caution">
                                Une caution de <strong>10€</strong> sera ajoutée lors du paiement. Elle vous sera remboursée à la restitution.
                            </Alert>
                        )}

                        {containerBalance > 0 && (
                            <Stack gap="xs" mt="sm">
                                <Text size="sm" fw={500}>Retour de tupperwares</Text>
                                <Text size="sm">Vous avez <b>{containerBalance}</b> tupperware(s) en votre possession.</Text>
                                <NumberInput
                                    label="Combien allez-vous en rendre ?"
                                    min={0}
                                    max={containerBalance}
                                    value={returnCount}
                                    onChange={(v) => setReturnCount(Number(v))}
                                />
                            </Stack>
                        )}
                    </Card>

                    <Group justify="space-between">
                        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => setActiveStep(0)}>
                            Retour
                        </Button>
                        <Button
                            rightSection={<IconArrowRight size={16} />}
                            disabled={!canAdvanceStep1}
                            onClick={() => setActiveStep(2)}
                        >
                            Suivant
                        </Button>
                    </Group>
                </Stack>
            )}

            {/* ── STEP 2 : Paiement ── */}
            {activeStep === 2 && (
                <Stack gap="lg">
                    <Card withBorder radius="md">
                        <Group mb="lg" gap="sm">
                            <ThemeIcon size="xl" variant="light" color="indigo" radius="md">
                                <IconCreditCard size={22} />
                            </ThemeIcon>
                            <div>
                                <Title order={4}>Paiement</Title>
                                <Text size="sm" c="dimmed">Règlement à la livraison</Text>
                            </div>
                        </Group>

                        <Alert icon={<IconAlertCircle size={16} />} color="blue" mb="md">
                            Le paiement s'effectue directement auprès du livreur : <strong>wero, lydia ou cash</strong>.
                        </Alert>

                        <Divider my="md" />

                        <Stack gap="xs">
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">Sous-total</Text>
                                <Text size="sm">{totalPrice.toFixed(2)} €</Text>
                            </Group>
                            {packaging === 'TUPPERWARE' && (
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">Caution tupperware</Text>
                                    <Text size="sm">10,00 €</Text>
                                </Group>
                            )}
                            <Divider />
                            <Group justify="space-between">
                                <Text fw={700}>Total à régler</Text>
                                <Text fw={700} c="indigo" size="lg">
                                    {(totalPrice + (packaging === 'TUPPERWARE' ? 10 : 0)).toFixed(2)} €
                                </Text>
                            </Group>
                        </Stack>
                    </Card>

                    <Group justify="space-between">
                        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => setActiveStep(1)}>
                            Retour
                        </Button>
                        <Button
                            size="lg"
                            leftSection={<IconCheck size={20} />}
                            loading={loading}
                            onClick={handleSubmit}
                            variant="gradient"
                            gradient={{ from: 'indigo', to: 'cyan' }}
                        >
                            Valider la commande
                        </Button>
                    </Group>
                </Stack>
            )}
        </Container>
    );
}
