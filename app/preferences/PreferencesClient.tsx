'use client';

import {
    Container,
    Title,
    Paper,
    Group,
    Text,
    Button,
    Stack,
    Chip,
    SimpleGrid,
    Card,
    ActionIcon,
    Modal,
    TextInput,
    PasswordInput,
    Alert,
    Combobox,
    useCombobox,
    Loader,
    SegmentedControl,
    Badge,
    Tabs,
    Radio,
    Switch,
    ThemeIcon,
    Divider,
} from '@mantine/core';
import { useDisclosure, useDebouncedValue } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useSearchParams } from 'next/navigation';
import {
    IconTrash, IconPlus, IconMapPin, IconDeviceFloppy, IconPencil, IconLock,
    IconUser, IconBox, IconLeaf, IconBell,
} from '@tabler/icons-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    updateProfileAction, updateDietaryPreferences, updatePackagingPreference,
    updateEmailPreferences, addAddressAction, deleteAddressAction, updateAddressAction,
    changePassword,
} from './actions';
import { DietaryOption, Address, AddressType, Packaging } from '@prisma/client';

const BAN_URL = 'https://api-adresse.data.gouv.fr/search/';

type BanFeature = {
    properties: { id: string; label: string; postcode: string; city: string; };
    geometry: { coordinates: [number, number]; };
};

async function fetchBanSuggestions(query: string): Promise<BanFeature[]> {
    if (query.trim().length < 3) return [];
    const params = new URLSearchParams({ q: query, limit: '6', autocomplete: '1' });
    const res = await fetch(`${BAN_URL}?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.features ?? [];
}

const DIETARY_LABELS: Record<string, string> = {
    'VEGETARIAN': 'Végétarien',
    'VEGAN': 'Vegan',
    'HALAL': 'Halal',
    'GLUTEN_FREE': 'Sans Gluten',
    'SPICY': 'Épicé'
};

type UserProps = {
    name: string | null;
    email: string;
    phoneNumber: string | null;
    containerBalance: number;
    defaultPackaging: Packaging;
    emailMenuWeekly: boolean;
    emailPromo: boolean;
    dietaryPreferences: DietaryOption[];
    addresses: Address[];
    hasPassword: boolean;
};

export default function PreferencesClient({ user }: { user: UserProps }) {
    const searchParams = useSearchParams();
    const onboarding = searchParams.get('onboarding');

    // Onglet actif
    const defaultTab = onboarding ? 'info' : 'info';

    // --- Informations personnelles ---
    const [name, setName] = useState(user.name || '');
    const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
    const [loadingProfile, setLoadingProfile] = useState(false);

    const profileDirty = name !== (user.name || '') || phoneNumber !== (user.phoneNumber || '');

    const handleSaveProfile = async () => {
        setLoadingProfile(true);
        try {
            const res = await updateProfileAction(name, phoneNumber);
            if (res.success) {
                notifications.show({ title: 'Succès', message: 'Informations mises à jour', color: 'green' });
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Erreur lors de la mise à jour', color: 'red' });
        } finally {
            setLoadingProfile(false);
        }
    };

    // --- Mot de passe ---
    const [pwCurrent, setPwCurrent] = useState('');
    const [pwNew, setPwNew] = useState('');
    const [pwConfirm, setPwConfirm] = useState('');
    const [loadingPw, setLoadingPw] = useState(false);

    const handleChangePassword = useCallback(async () => {
        if (pwNew !== pwConfirm) {
            notifications.show({ title: 'Erreur', message: 'Les mots de passe ne correspondent pas', color: 'red' });
            return;
        }
        setLoadingPw(true);
        try {
            const res = await changePassword(pwCurrent, pwNew);
            if (res.success) {
                notifications.show({ title: 'Succès', message: 'Mot de passe mis à jour', color: 'green' });
                setPwCurrent(''); setPwNew(''); setPwConfirm('');
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Erreur lors de la mise à jour', color: 'red' });
        } finally {
            setLoadingPw(false);
        }
    }, [pwCurrent, pwNew, pwConfirm]);

    // --- Tupperwares ---
    const [defaultPackaging, setDefaultPackaging] = useState<Packaging>(user.defaultPackaging);
    const [loadingPackaging, setLoadingPackaging] = useState(false);

    const handleSavePackaging = async (val: Packaging) => {
        setDefaultPackaging(val);
        setLoadingPackaging(true);
        try {
            const res = await updatePackagingPreference(val);
            if (res.success) {
                notifications.show({ title: 'Succès', message: 'Préférence d\'emballage enregistrée', color: 'green' });
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Erreur lors de la mise à jour', color: 'red' });
        } finally {
            setLoadingPackaging(false);
        }
    };

    // --- Préférences alimentaires & emails ---
    const [dietary, setDietary] = useState<string[]>(user.dietaryPreferences);
    const [emailMenuWeekly, setEmailMenuWeekly] = useState(user.emailMenuWeekly);
    const [emailPromo, setEmailPromo] = useState(user.emailPromo);
    const [loadingPrefs, setLoadingPrefs] = useState(false);

    const handleSavePrefs = async () => {
        setLoadingPrefs(true);
        try {
            const [dietRes, emailRes] = await Promise.all([
                updateDietaryPreferences(dietary as DietaryOption[]),
                updateEmailPreferences(emailMenuWeekly, emailPromo),
            ]);
            if (dietRes.success && emailRes.success) {
                notifications.show({ title: 'Succès', message: 'Préférences enregistrées', color: 'green' });
            } else {
                notifications.show({ title: 'Erreur', message: dietRes.error || emailRes.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'enregistrement', color: 'red' });
        } finally {
            setLoadingPrefs(false);
        }
    };

    const prefsDirty =
        JSON.stringify(dietary.sort()) !== JSON.stringify([...user.dietaryPreferences].sort()) ||
        emailMenuWeekly !== user.emailMenuWeekly ||
        emailPromo !== user.emailPromo;

    // --- Adresses ---
    const [opened, { open, close }] = useDisclosure(false);
    const [addressLoading, setAddressLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });
    const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [addressCoords, setAddressCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [hasSelectedFromDropdown, setHasSelectedFromDropdown] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const addressForm = useForm({
        initialValues: { label: '', type: 'DOMICILE' as AddressType, content: '', details: '' },
        validate: {
            label: (val) => (val.length < 2 ? 'Nom trop court' : null),
            content: (val) => (val.length < 5 ? 'Adresse trop courte' : null),
        },
    });

    const [debouncedContent] = useDebouncedValue(addressForm.values.content, 300);

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

    const handleOpenNew = () => {
        setEditingId(null); addressForm.reset(); setSuggestions([]);
        setAddressCoords(null); setHasSelectedFromDropdown(false); open();
    };

    const handleEdit = (addr: Address) => {
        setEditingId(addr.id);
        addressForm.setValues({ label: addr.label, type: addr.type, content: addr.content, details: (addr as any).details || '' });
        setSuggestions([]);
        setAddressCoords(addr.lat && addr.lon ? { lat: addr.lat as number, lon: addr.lon as number } : null);
        setHasSelectedFromDropdown(false);
        open();
    };

    const handleSelectSuggestion = (feature: BanFeature) => {
        const [lon, lat] = feature.geometry.coordinates;
        addressForm.setFieldValue('content', feature.properties.label);
        setAddressCoords({ lat, lon });
        setHasSelectedFromDropdown(true);
        setSuggestions([]);
        combobox.closeDropdown();
    };

    const handleSaveAddress = async (values: typeof addressForm.values) => {
        setAddressLoading(true);
        try {
            let res;
            if (editingId) {
                res = await updateAddressAction(editingId, values.label, values.content, values.details, addressCoords?.lat, addressCoords?.lon, values.type);
            } else {
                res = await addAddressAction(values.label, values.content, values.details, addressCoords?.lat, addressCoords?.lon, values.type);
            }
            if (res.success) {
                notifications.show({ title: 'Succès', message: editingId ? 'Adresse mise à jour' : 'Adresse ajoutée', color: 'green' });
                close(); addressForm.reset(); setEditingId(null); setAddressCoords(null); setHasSelectedFromDropdown(false);
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Erreur lors de l\'enregistrement', color: 'red' });
        } finally {
            setAddressLoading(false);
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (!confirm('Supprimer cette adresse ?')) return;
        try {
            const res = await deleteAddressAction(id);
            if (res.success) {
                notifications.show({ title: 'Succès', message: 'Adresse supprimée', color: 'green' });
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Erreur inconnue', color: 'red' });
        }
    };

    return (
        <Container size="lg" pt="xs" pb="xl">
            <Title order={3} mb="md">Mon Profil</Title>

            {onboarding && (
                <Alert title="Bienvenue !" color="blue" mb="xl">
                    Avant de passer votre première commande, merci de renseigner votre numéro de téléphone et au moins une adresse de livraison.
                </Alert>
            )}

            <Tabs defaultValue={defaultTab}>
                <Tabs.List mb="xl" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
                    <Tabs.Tab value="info" leftSection={<IconUser size={16} />} style={{ whiteSpace: 'nowrap' }}>Profil</Tabs.Tab>
                    <Tabs.Tab value="addresses" leftSection={<IconMapPin size={16} />} style={{ whiteSpace: 'nowrap' }}>Adresses</Tabs.Tab>
                    <Tabs.Tab value="tupperware" leftSection={<IconBox size={16} />} style={{ whiteSpace: 'nowrap' }}>Tupperwares</Tabs.Tab>
                    <Tabs.Tab value="preferences" leftSection={<IconLeaf size={16} />} style={{ whiteSpace: 'nowrap' }}>Préférences</Tabs.Tab>
                </Tabs.List>

                {/* ───── INFORMATIONS PERSONNELLES ───── */}
                <Tabs.Panel value="info">
                    <Stack gap="xl">
                        <Paper withBorder p="lg" radius="md">
                            <Title order={4} mb="md">Informations personnelles</Title>
                            <Stack gap="md">
                                <TextInput
                                    label="Prénom / Nom"
                                    placeholder="Jean Dupont"
                                    value={name}
                                    onChange={(e) => setName(e.currentTarget.value)}
                                />
                                <TextInput
                                    label="Email"
                                    value={user.email}
                                    disabled
                                />
                                <TextInput
                                    label="Téléphone"
                                    placeholder="06 12 34 56 78"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.currentTarget.value)}
                                />
                                <Group justify="flex-end">
                                    <Button
                                        leftSection={<IconDeviceFloppy size={16} />}
                                        onClick={handleSaveProfile}
                                        loading={loadingProfile}
                                        disabled={!profileDirty}
                                    >
                                        Enregistrer
                                    </Button>
                                </Group>
                            </Stack>
                        </Paper>

                        {user.hasPassword && (
                            <Paper withBorder p="lg" radius="md">
                                <Title order={4} mb="md">Changer le mot de passe</Title>
                                <Stack gap="sm">
                                    <PasswordInput
                                        label="Mot de passe actuel"
                                        placeholder="••••••••"
                                        leftSection={<IconLock size={16} />}
                                        value={pwCurrent}
                                        onChange={(e) => setPwCurrent(e.currentTarget.value)}
                                    />
                                    <PasswordInput
                                        label="Nouveau mot de passe"
                                        placeholder="Au moins 8 caractères"
                                        leftSection={<IconLock size={16} />}
                                        value={pwNew}
                                        onChange={(e) => setPwNew(e.currentTarget.value)}
                                    />
                                    <PasswordInput
                                        label="Confirmer le nouveau mot de passe"
                                        placeholder="••••••••"
                                        leftSection={<IconLock size={16} />}
                                        value={pwConfirm}
                                        onChange={(e) => setPwConfirm(e.currentTarget.value)}
                                    />
                                    <Group justify="flex-end">
                                        <Button
                                            onClick={handleChangePassword}
                                            loading={loadingPw}
                                            disabled={!pwCurrent || !pwNew || !pwConfirm}
                                            variant="light"
                                        >
                                            Mettre à jour
                                        </Button>
                                    </Group>
                                </Stack>
                            </Paper>
                        )}
                    </Stack>
                </Tabs.Panel>

                {/* ───── ADRESSES ───── */}
                <Tabs.Panel value="addresses">
                    <Paper withBorder p="lg" radius="md">
                        <Group justify="space-between" mb="md">
                            <Title order={4}>Mes adresses de livraison</Title>
                            <Button leftSection={<IconPlus size={16} />} onClick={handleOpenNew} variant="light">
                                Nouvelle adresse
                            </Button>
                        </Group>

                        {user.addresses.length === 0 ? (
                            <Text c="dimmed" fs="italic">Aucune adresse enregistrée.</Text>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                {user.addresses.map(addr => (
                                    <Card key={addr.id} withBorder shadow="sm" radius="md">
                                        <Group justify="space-between" align="flex-start" mb="xs">
                                            <Group gap="xs">
                                                <IconMapPin size={16} color="gray" />
                                                <Text fw={600}>{addr.label}</Text>
                                                <Badge size="xs" variant="light" color={addr.type === 'BUREAU' ? 'blue' : 'green'}>
                                                    {addr.type === 'BUREAU' ? 'Bureau' : 'Domicile'}
                                                </Badge>
                                            </Group>
                                            <Group gap={0}>
                                                <ActionIcon color="blue" variant="subtle" onClick={() => handleEdit(addr)}>
                                                    <IconPencil size={16} />
                                                </ActionIcon>
                                                <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteAddress(addr.id)}>
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Group>
                                        </Group>
                                        <Text size="sm" style={{ whiteSpace: 'pre-line' }}>{addr.content}</Text>
                                        {(addr as any).details && (
                                            <Text size="xs" c="dimmed" mt={4}>{(addr as any).details}</Text>
                                        )}
                                    </Card>
                                ))}
                            </SimpleGrid>
                        )}
                    </Paper>
                </Tabs.Panel>

                {/* ───── TUPPERWARES ───── */}
                <Tabs.Panel value="tupperware">
                    <Stack gap="xl">
                        <Paper withBorder p="lg" radius="md">
                            <Title order={4} mb="md">Mes tupperwares</Title>
                            <Card bg="blue.0" withBorder radius="md" p="md" mb="lg">
                                <Group>
                                    <ThemeIcon size="xl" variant="light" color="blue" radius="md">
                                        <IconBox size={22} />
                                    </ThemeIcon>
                                    <div>
                                        <Text fw={600}>En votre possession</Text>
                                        <Text size="sm">
                                            <Text span fw={700} c="blue" size="xl">{user.containerBalance}</Text>
                                            {' '}tupperware{user.containerBalance > 1 ? 's' : ''}
                                        </Text>
                                    </div>
                                </Group>
                            </Card>

                            <Divider mb="lg" />

                            <Title order={5} mb="xs">Emballage par défaut</Title>
                            <Text size="sm" c="dimmed" mb="md">
                                Ce choix sera présélectionné à chaque commande, mais vous pourrez le modifier dans le panier.
                            </Text>

                            <Radio.Group
                                value={defaultPackaging}
                                onChange={(val) => handleSavePackaging(val as Packaging)}
                            >
                                <Stack gap="sm">
                                    <Radio
                                        value="CARDBOARD"
                                        label="Carton (jetable / recyclable)"
                                        disabled={loadingPackaging}
                                    />
                                    <Radio
                                        value="TUPPERWARE"
                                        label="Tupperware (consigné)"
                                        disabled={loadingPackaging}
                                    />
                                </Stack>
                            </Radio.Group>

                            {defaultPackaging === 'TUPPERWARE' && (
                                <Alert color="orange" mt="md" title="Information caution">
                                    Une caution de <strong>10€</strong> par tupperware sera ajoutée lors du paiement de chaque commande.
                                    Elle vous sera remboursée à la restitution du contenant.
                                </Alert>
                            )}
                        </Paper>
                    </Stack>
                </Tabs.Panel>

                {/* ───── PRÉFÉRENCES ───── */}
                <Tabs.Panel value="preferences">
                    <Paper withBorder p="lg" radius="md">
                        <Group justify="space-between" mb="md">
                            <Title order={4}>Préférences</Title>
                            <Button
                                leftSection={<IconDeviceFloppy size={16} />}
                                onClick={handleSavePrefs}
                                loading={loadingPrefs}
                                variant="light"
                                disabled={!prefsDirty}
                            >
                                Enregistrer
                            </Button>
                        </Group>

                        <Title order={5} mb="xs">Régime alimentaire</Title>
                        <Text size="sm" c="dimmed" mb="md">
                            Ces informations aident à adapter les menus proposés.
                        </Text>
                        <Chip.Group multiple value={dietary} onChange={setDietary}>
                            <Group gap="xs" mb="xl">
                                {Object.entries(DIETARY_LABELS).map(([key, label]) => (
                                    <Chip key={key} value={key} variant="outline" radius="sm">
                                        {label}
                                    </Chip>
                                ))}
                            </Group>
                        </Chip.Group>

                        <Divider mb="lg" />

                        <Title order={5} mb="xs">Notifications par email</Title>
                        <Text size="sm" c="dimmed" mb="md">
                            Choisissez les emails que vous souhaitez recevoir.
                        </Text>
                        <Stack gap="sm">
                            <Switch
                                label="Menu de la semaine"
                                description="Recevez le menu chaque semaine à sa publication"
                                checked={emailMenuWeekly}
                                onChange={(e) => setEmailMenuWeekly(e.currentTarget.checked)}
                            />
                            <Switch
                                label="Promos & annonces"
                                description="Offres spéciales, nouveautés et exclusivités"
                                checked={emailPromo}
                                onChange={(e) => setEmailPromo(e.currentTarget.checked)}
                            />
                        </Stack>
                    </Paper>
                </Tabs.Panel>
            </Tabs>

            {/* Modal adresse */}
            <Modal opened={opened} onClose={close} title={editingId ? "Modifier l'adresse" : "Ajouter une adresse"}>
                <form onSubmit={addressForm.onSubmit(handleSaveAddress)}>
                    <Stack>
                        <SegmentedControl
                            data={[
                                { label: '🏠 Domicile', value: 'DOMICILE' },
                                { label: '🏢 Bureau', value: 'BUREAU' },
                            ]}
                            {...addressForm.getInputProps('type')}
                        />
                        <TextInput
                            label="Nom (ex: Chez moi, Bureau principal)"
                            placeholder="Chez moi"
                            withAsterisk
                            {...addressForm.getInputProps('label')}
                        />

                        <Combobox store={combobox} onOptionSubmit={() => {}}>
                            <Combobox.Target>
                                <TextInput
                                    label="Adresse"
                                    placeholder="32 rue de Rivoli, Paris..."
                                    withAsterisk
                                    rightSection={loadingSuggestions ? <Loader size="xs" /> : null}
                                    {...addressForm.getInputProps('content')}
                                    onChange={(e) => {
                                        addressForm.setFieldValue('content', e.currentTarget.value);
                                        setHasSelectedFromDropdown(false);
                                        setAddressCoords(null);
                                    }}
                                    onFocus={() => { if (suggestions.length > 0) combobox.openDropdown(); }}
                                    onBlur={() => combobox.closeDropdown()}
                                />
                            </Combobox.Target>
                            <Combobox.Dropdown>
                                <Combobox.Options>
                                    {suggestions.map((feature) => (
                                        <Combobox.Option
                                            key={feature.properties.id}
                                            value={feature.properties.label}
                                            onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(feature); }}
                                        >
                                            {feature.properties.label}
                                        </Combobox.Option>
                                    ))}
                                </Combobox.Options>
                            </Combobox.Dropdown>
                        </Combobox>

                        <TextInput
                            label="Complément"
                            placeholder="Code: 1234, Etage..."
                            {...addressForm.getInputProps('details')}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="default" onClick={close}>Annuler</Button>
                            <Button type="submit" loading={addressLoading}>{editingId ? "Enregistrer" : "Ajouter"}</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
}
