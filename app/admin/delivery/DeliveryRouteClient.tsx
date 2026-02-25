'use client';

import { useState } from 'react';
import { Select, Button, Card, Stack, Text, Group, Badge, Divider, Alert, Paper, NumberInput, Slider, Tooltip, Loader, Progress } from '@mantine/core';
import { IconRoute, IconMapPin, IconHome, IconTruck, IconCheck, IconChefHat, IconPlayerPlay, IconClock, IconAlertTriangle, IconWorld } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { startDeliveryForDateAction, markOrdersAsKitchenAction } from './actions';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** Describes a client's delivery time constraint. */
interface TimeConstraint {
    type: 'before' | 'after';
    time: number; // minutes since midnight
}

interface MenuOption {
    value: string;
    label: string;
    date: Date;
    orderCount: number;
}

interface Order {
    id: string;
    deliveryAddress: string;
    notes: string | null;
    user: { name: string | null; email: string };
}

interface Menu {
    id: string;
    date: Date;
    orders: Order[];
}

interface DeliveryRouteClientProps {
    menuOptions: MenuOption[];
    weekMenus: Menu[];
}

interface GeocodedOrder extends Order {
    lat: number | null;
    lon: number | null;
    geocodeDisplay?: string;
}

interface RouteStop {
    order: GeocodedOrder;
    constraint: TimeConstraint | null;
    estimatedArrival: number;       // minutes since midnight
    travelMinutes: number;          // travel time from previous stop
    distanceKm: number;             // distance from previous stop
    isLate: boolean;                // 'before' type: arrived after deadline
    isTooEarly: boolean;            // 'after' type: arrived before window opens
    waitMinutes: number;            // minutes to wait if too early
}

interface RouteResult {
    stops: RouteStop[];
    totalDuration: number;          // minutes (including waits)
    totalDistanceKm: number;
    lateCount: number;
    tooEarlyCount: number;
    usingRealData: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the geocodable street address from the stored deliveryAddress field.
 *
 * The stored format is: "[label] street address, city \n(Complément: details)"
 * We need only the core address, e.g. "7 rue Daguerre, 75014, Paris"
 *
 * Steps:
 * 1. Remove everything between [ ] at the start (label like "[Maison]" or "[Rien à voir]")
 * 2. Remove complement block: "(Complément: ...)" and everything after a newline
 * 3. Trim the result
 */
function extractGeoAddress(raw: string): string {
    // Remove leading [label] block like "[Maison]" or "[Rien à voir]"
    let addr = raw.replace(/^\s*\[.*?\]\s*/, '');
    // Remove (Complément: ...) block — use [\s\S] instead of . with /s flag for compat
    addr = addr.replace(/\n?\s*\(Complément:[\s\S]*?\)/, '');
    // Cut at the first newline (remove anything after line 1)
    const firstLine = addr.split('\n')[0];
    return firstLine.trim();
}

/**
 * Parse a time constraint from the notes, returning:
 * - type 'before' → client must be delivered BEFORE this time (deadline max)
 *   Examples: "avant 11h30", "absent après 12h", "pas dispo après 12h"
 * - type 'after'  → client must be delivered AFTER this time (window min)
 *   Examples: "après 12h30", "pas dispo avant 12h", "pas là avant 11h30"
 * - null → no constraint parsed
 */
function parseConstraint(notes: string | null): TimeConstraint | null {
    if (!notes) return null;
    const lower = notes.toLowerCase();
    const line = lower.split('\n').find(l => l.includes('⏰'));
    if (!line) return null;

    const toMin = (h: string, m: string) =>
        parseInt(h) * 60 + (m ? parseInt(m.padEnd(2, '0')) : 0);

    // Patterns that mean "not available AFTER X" → deliver BEFORE X (deadline max)
    const absentAfter = line.match(/(?:absent|indisponible|pas (?:dispo|disponible|là|la)|partir).*?apr[eè]s\s+(\d{1,2})h(\d{0,2})/);
    const beforeMatch = line.match(/avant\s+(\d{1,2})h(\d{0,2})/);

    // Patterns that mean "not available BEFORE X" → deliver AFTER X (window min)
    const absentBefore = line.match(/(?:absent|indisponible|pas (?:dispo|disponible|là|la)).*?avant\s+(\d{1,2})h(\d{0,2})/);
    const afterMatch = line.match(/(?:^|[\s,;])apr[eè]s\s+(\d{1,2})h(\d{0,2})/);

    // "absent...après" beats plain "après" (more specific)
    if (absentAfter) return { type: 'before', time: toMin(absentAfter[1], absentAfter[2]) };
    if (beforeMatch) return { type: 'before', time: toMin(beforeMatch[1], beforeMatch[2]) };
    if (absentBefore) return { type: 'after', time: toMin(absentBefore[1], absentBefore[2]) };
    if (afterMatch) return { type: 'after', time: toMin(afterMatch[1], afterMatch[2]) };

    return null;
}

function formatTime(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
}

function formatDistance(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SMART TSP WITH EDF + REAL TRAVEL TIMES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TSP solver with constraint-aware scheduling:
 *
 * Priority order:
 *  1. 'before' constrained stops → Earliest Deadline First (urgent, must arrive BEFORE deadline)
 *  2. Unconstrained stops → Nearest Neighbor from current position
 *  3. 'after' constrained stops → schedule last (client not ready before their window)
 *
 * For 'after' stops: if we arrive too early, we flag isTooEarly and waitMinutes.
 */
function solveRoute(
    orders: GeocodedOrder[],
    durationMatrix: number[][],
    distanceMatrix: number[][],
    departureMin: number,
    handoverMin: number
): RouteStop[] {
    const constraints = orders.map(o => parseConstraint(o.notes));
    const n = orders.length;

    // Separate into three buckets
    const beforeBucket = orders
        .map((_, i) => i)
        .filter(i => constraints[i]?.type === 'before')
        .sort((a, b) => (constraints[a]!.time) - (constraints[b]!.time)); // EDF

    const afterBucket = orders
        .map((_, i) => i)
        .filter(i => constraints[i]?.type === 'after');

    const freeBucket = orders
        .map((_, i) => i)
        .filter(i => constraints[i] === null);

    const stops: RouteStop[] = [];
    let currentNode = 0; // 0 = home
    let currentTime = departureMin;

    const travelTo = (from: number, orderIdx: number) => durationMatrix[from][orderIdx + 1] / 60;
    const distTo = (from: number, orderIdx: number) => distanceMatrix[from][orderIdx + 1] / 1000;

    const addStop = (idx: number) => {
        const travel = travelTo(currentNode, idx);
        const dist = distTo(currentNode, idx);
        const arrival = currentTime + travel;
        const constraint = constraints[idx];

        let isLate = false;
        let isTooEarly = false;
        let waitMinutes = 0;

        if (constraint?.type === 'before') {
            isLate = arrival > constraint.time;
        } else if (constraint?.type === 'after') {
            isTooEarly = arrival < constraint.time;
            waitMinutes = isTooEarly ? Math.ceil(constraint.time - arrival) : 0;
        }

        const finalArrival = Math.round(arrival);
        stops.push({
            order: orders[idx],
            constraint,
            estimatedArrival: finalArrival,
            travelMinutes: Math.round(travel),
            distanceKm: Math.round(dist * 10) / 10,
            isLate,
            isTooEarly,
            waitMinutes,
        });

        currentNode = idx + 1;
        // If too early for 'after' stop, add the wait time to current clock
        currentTime = arrival + handoverMin + (isTooEarly ? waitMinutes : 0);
    };

    // 1. Before-constrained stops (EDF)
    for (const idx of beforeBucket) addStop(idx);

    // 2. Unconstrained stops (nearest neighbor)
    const freeRemaining = [...freeBucket];
    while (freeRemaining.length > 0) {
        let best = -1, bestTravel = Infinity;
        for (const idx of freeRemaining) {
            const t = travelTo(currentNode, idx);
            if (t < bestTravel) { bestTravel = t; best = idx; }
        }
        freeRemaining.splice(freeRemaining.indexOf(best), 1);
        addStop(best);
    }

    // 3. After-constrained stops (schedule last, nearest neighbor among them)
    const afterRemaining = [...afterBucket];
    while (afterRemaining.length > 0) {
        let best = -1, bestTravel = Infinity;
        for (const idx of afterRemaining) {
            const t = travelTo(currentNode, idx);
            if (t < bestTravel) { bestTravel = t; best = idx; }
        }
        afterRemaining.splice(afterRemaining.indexOf(best), 1);
        addStop(best);
    }

    return stops;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function DeliveryRouteClient({ menuOptions, weekMenus }: DeliveryRouteClientProps) {
    const todayMenu = weekMenus.find(m => dayjs(m.date).isSame(dayjs(), 'day'));
    const defaultMenuId = todayMenu?.id || (menuOptions.length > 0 ? menuOptions[0].value : null);

    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(defaultMenuId);
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
    const [calculationLoading, setCalculationLoading] = useState(false);
    const [calculationStep, setCalculationStep] = useState<string>('');
    const [calculationProgress, setCalculationProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [departureHour, setDepartureHour] = useState(11);
    const [departureMinute, setDepartureMinute] = useState(0);
    const [handoverMin, setHandoverMin] = useState(3);
    const [vehicleType, setVehicleType] = useState<'car' | 'scooter'>('scooter');
    // Stores addresses that Nominatim couldn't geocode, with context
    const [geocodeWarnings, setGeocodeWarnings] = useState<Array<{
        clientName: string;
        address: string;
    }>>([]);

    const selectedMenu = weekMenus.find(m => m.id === selectedMenuId);

    const handleCalculateRoute = async () => {
        if (!selectedMenu || selectedMenu.orders.length === 0) return;

        setCalculationLoading(true);
        setRouteResult(null);
        setGeocodeWarnings([]);
        const departureMinutes = departureHour * 60 + departureMinute;
        const orders = selectedMenu.orders;

        try {
            // ── Step 1: Geocode all addresses ──
            setCalculationStep(`Géocodage des adresses (${orders.length} stops)…`);
            setCalculationProgress(10);

            const geocodeRes = await fetch('/api/geocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // extractGeoAddress strips [label], (Complément: ...) etc.
                // Only the clean street address is sent to Nominatim
                body: JSON.stringify({ addresses: orders.map(o => extractGeoAddress(o.deliveryAddress)) }),
            });

            if (!geocodeRes.ok) throw new Error('Geocoding failed');

            const { results: geocoded } = await geocodeRes.json() as {
                results: Array<{ address: string; lat: number | null; lon: number | null; display: string }>
            };

            setCalculationProgress(50);

            // Map back to orders
            const geocodedOrders: GeocodedOrder[] = orders.map((order, i) => ({
                ...order,
                lat: geocoded[i]?.lat ?? null,
                lon: geocoded[i]?.lon ?? null,
                geocodeDisplay: geocoded[i]?.display,
            }));

            const validOrders = geocodedOrders.filter(o => o.lat !== null && o.lon !== null);
            const invalidOrders = geocodedOrders.filter(o => o.lat === null || o.lon === null);

            if (invalidOrders.length > 0) {
                // Store which clients/addresses failed for detailed UI display
                setGeocodeWarnings(invalidOrders.map(o => ({
                    clientName: o.user.name || o.user.email,
                    address: o.deliveryAddress,
                })));
            }

            if (validOrders.length < 2) {
                // Fallback: fixed estimation (can't compute matrix with <2 geocodable points)
                const fallbackStops: RouteStop[] = geocodedOrders.map(order => {
                    const constraint = parseConstraint(order.notes);
                    const arrival = departureMinutes + handoverMin;
                    const isLate = constraint?.type === 'before' && arrival > constraint.time;
                    const isTooEarly = constraint?.type === 'after' && arrival < constraint.time;
                    const waitMinutes = isTooEarly ? Math.ceil(constraint!.time - arrival) : 0;
                    return { order, constraint, estimatedArrival: arrival, travelMinutes: 0, distanceKm: 0, isLate, isTooEarly, waitMinutes };
                });
                setRouteResult({
                    stops: fallbackStops,
                    totalDuration: fallbackStops.length * handoverMin,
                    totalDistanceKm: 0,
                    lateCount: fallbackStops.filter(s => s.isLate).length,
                    tooEarlyCount: fallbackStops.filter(s => s.isTooEarly).length,
                    usingRealData: false,
                });
                return;
            }

            // ── Step 2: Build distance matrix via OSRM ──
            // Include a fake "home" point at index 0 (we use first valid order as proxy if no home configured)
            // In a real setup you'd add your home GPS coordinates here
            // For now: home = centroid of all delivery points (good enough for ordering)
            const avgLat = validOrders.reduce((s, o) => s + o.lat!, 0) / validOrders.length;
            const avgLon = validOrders.reduce((s, o) => s + o.lon!, 0) / validOrders.length;

            const coordinates = [
                { lat: avgLat, lon: avgLon }, // index 0 = home/hub
                ...validOrders.map(o => ({ lat: o.lat!, lon: o.lon! })),
            ];

            setCalculationStep('Calcul des temps de trajet réels (OSRM)…');
            setCalculationProgress(70);

            const matrixRes = await fetch('/api/route-matrix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coordinates }),
            });

            if (!matrixRes.ok) throw new Error('OSRM failed');

            const { durations, distances } = await matrixRes.json() as {
                durations: number[][];
                distances: number[][];
            };

            setCalculationStep('Optimisation de l\'itinéraire…');
            setCalculationProgress(90);

            // ── Step 3: Apply vehicle speed factor ──
            // OSRM public instance only offers car routing.
            // Scooter in Paris urban traffic: ~30% faster (bus lanes, traffic filtering, no parking).
            const speedFactor = vehicleType === 'scooter' ? 0.70 : 1.0;
            const adjustedDurations = durations.map(row => row.map(d => d * speedFactor));

            // ── Step 4: Solve TSP ──
            const stops = solveRoute(validOrders, adjustedDurations, distances, departureMinutes, handoverMin);
            const totalMinutes = stops.reduce((s, st) => s + st.travelMinutes, 0) + stops.length * handoverMin;
            const totalKm = stops.reduce((s, st) => s + st.distanceKm, 0);

            setRouteResult({
                stops,
                totalDuration: totalMinutes,
                totalDistanceKm: Math.round(totalKm * 10) / 10,
                lateCount: stops.filter(s => s.isLate).length,
                tooEarlyCount: stops.filter(s => s.isTooEarly).length,
                usingRealData: true,
            });

        } catch (err) {
            console.error(err);
            notifications.show({ title: 'Erreur', message: 'Calcul d\'itinéraire impossible. Vérifiez votre connexion.', color: 'red' });
        } finally {
            setCalculationLoading(false);
            setCalculationStep('');
            setCalculationProgress(0);
        }
    };

    const handleStartDelivery = async () => {
        if (!selectedMenuId) return;
        setLoading(true);
        try {
            const result = await startDeliveryForDateAction(selectedMenuId);
            notifications.show({ title: result.success ? 'Succès' : 'Erreur', message: result.success ? result.message : result.error, color: result.success ? 'green' : 'red' });
        } finally { setLoading(false); }
    };

    const handleMarkAsKitchen = async () => {
        if (!selectedMenuId) return;
        setLoading(true);
        try {
            const result = await markOrdersAsKitchenAction(selectedMenuId);
            notifications.show({ title: result.success ? 'Succès' : 'Erreur', message: result.success ? result.message : result.error, color: result.success ? 'green' : 'red' });
        } finally { setLoading(false); }
    };

    return (
        <Stack gap="lg">
            {/* ── Selector + actions ── */}
            <Card withBorder shadow="sm" radius="md" p="lg">
                <Stack gap="md">
                    <Text fw={600} size="lg">Sélectionner un jour de livraison</Text>
                    <Select
                        label="Menu du jour"
                        placeholder="Choisir un menu"
                        data={menuOptions}
                        value={selectedMenuId}
                        onChange={(v) => { setSelectedMenuId(v); setRouteResult(null); }}
                        size="md"
                    />
                    {selectedMenu && (
                        <>
                            <Divider />
                            <Group justify="space-between">
                                <div>
                                    <Text size="sm" c="dimmed">Date de livraison</Text>
                                    <Text fw={600}>{dayjs(selectedMenu.date).format('dddd DD MMMM YYYY')}</Text>
                                </div>
                                <Badge size="lg" color="blue">{selectedMenu.orders.length} livraison(s)</Badge>
                            </Group>
                            <Divider label="Actions rapides" labelPosition="center" />
                            <Group grow>
                                <Button leftSection={<IconChefHat size={18} />} onClick={handleMarkAsKitchen}
                                    size="sm" variant="light" color="orange" loading={loading}
                                    disabled={selectedMenu.orders.length === 0}>
                                    Passer en cuisine
                                </Button>
                                <Button leftSection={<IconPlayerPlay size={18} />} onClick={handleStartDelivery}
                                    size="sm" variant="gradient" gradient={{ from: 'cyan', to: 'blue' }}
                                    loading={loading} disabled={selectedMenu.orders.length === 0}>
                                    Démarrer les livraisons
                                </Button>
                            </Group>
                        </>
                    )}
                </Stack>
            </Card>

            {/* ── Route parameters ── */}
            {selectedMenu && selectedMenu.orders.length > 0 && (
                <Card withBorder shadow="sm" radius="md" p="lg">
                    <Group mb="md">
                        <IconWorld size={20} color="#1971c2" />
                        <Text fw={600} size="lg">Paramètres de l'itinéraire</Text>
                        <Badge size="xs" color="teal" variant="light">Nominatim + OSRM</Badge>
                    </Group>

                    <Alert color="teal" icon={<IconCheck size={14} />} mb="md">
                        <Text size="xs">
                            Les adresses seront géocodées via <b>OpenStreetMap (Nominatim)</b> puis les temps de trajet réels calculés via <b>OSRM</b> — entièrement gratuit.
                            Le géocodage prend ~{selectedMenu.orders.length} seconde(s).
                        </Text>
                    </Alert>

                    <Stack gap="md">
                        {/* Vehicle type selector */}
                        <div>
                            <Text size="sm" fw={500} mb={6}>Véhicule de livraison</Text>
                            <Group gap="xs">
                                <Button
                                    variant={vehicleType === 'car' ? 'filled' : 'light'}
                                    color={vehicleType === 'car' ? 'blue' : 'gray'}
                                    onClick={() => setVehicleType('car')}
                                    leftSection={<span>🚗</span>}
                                    size="sm"
                                >
                                    Voiture
                                </Button>
                                <Button
                                    variant={vehicleType === 'scooter' ? 'filled' : 'light'}
                                    color={vehicleType === 'scooter' ? 'teal' : 'gray'}
                                    onClick={() => setVehicleType('scooter')}
                                    leftSection={<span>🛵</span>}
                                    size="sm"
                                >
                                    Scooter / Moto
                                </Button>
                            </Group>
                            {vehicleType === 'scooter' && (
                                <Text size="xs" c="dimmed" mt={4}>
                                    Le temps de trajet voiture (OSRM) est réduit de 30% — bus lanes, filtrage du trafic, pas de recherche de stationnement.
                                </Text>
                            )}
                        </div>

                        <Group grow align="flex-end">
                            <NumberInput label="Heure de départ" min={7} max={14} value={departureHour}
                                onChange={(v) => setDepartureHour(Number(v))} suffix="h" />
                            <NumberInput label="Minute" min={0} max={59} value={departureMinute}
                                onChange={(v) => setDepartureMinute(Number(v))} suffix="min" />
                        </Group>

                        <div>
                            <Text size="sm" fw={500} mb={4}>
                                Temps de remise à la porte : <b>{handoverMin} min</b>
                            </Text>
                            <Text size="xs" c="dimmed" mb={8}>
                                Sonnerie + remise du colis. Le trajet entre adresses est calculé automatiquement.
                            </Text>
                            <Slider min={1} max={10} step={1} value={handoverMin} onChange={setHandoverMin}
                                marks={[{ value: 2, label: '2 min' }, { value: 5, label: '5 min' }, { value: 8, label: '8 min' }]}
                            />
                        </div>

                        {calculationLoading && (
                            <Stack gap="xs">
                                <Text size="sm" c="dimmed">{calculationStep}</Text>
                                <Progress value={calculationProgress} animated />
                            </Stack>
                        )}

                        <Button
                            leftSection={calculationLoading ? <Loader size={16} color="white" /> : <IconRoute size={18} />}
                            onClick={handleCalculateRoute}
                            size="md"
                            fullWidth
                            loading={calculationLoading}
                            disabled={calculationLoading}
                        >
                            {calculationLoading ? calculationStep : 'Calculer l\'itinéraire optimal (temps réels)'}
                        </Button>

                        {/* ── Geocoding warnings ── */}
                        {geocodeWarnings.length > 0 && (
                            <Alert
                                color="yellow"
                                icon={<IconAlertTriangle size={18} />}
                                title={`${geocodeWarnings.length} adresse(s) introuvable(s) sur OpenStreetMap`}
                            >
                                <Stack gap="xs">
                                    <Text size="xs">
                                        Ces clients seront <b>exclus du calcul d'itinéraire</b> car leur adresse n'a pas pu être géolocalisée :
                                    </Text>
                                    {geocodeWarnings.map((w, i) => (
                                        <Paper key={i} p="xs" style={{ backgroundColor: '#fffbe6' }} withBorder>
                                            <Text size="xs" fw={600}>{w.clientName}</Text>
                                            <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>{w.address}</Text>
                                        </Paper>
                                    ))}
                                    <Divider />
                                    <Text size="xs" fw={500}>Causes fréquentes :</Text>
                                    <Text size="xs" c="dimmed">
                                        • <b>Adresse incomplète</b> — ex. "5 rue de la Paix" sans ville ni code postal<br />
                                        • <b>Faute de frappe</b> — ex. "boulevard" mal orthographié<br />
                                        • <b>Adresse trop vague</b> — ex. "chez moi" ou "en face de la boulangerie"<br />
                                        • <b>Adresse introuvable dans OpenStreetMap</b> — pour les voies très récentes ou peu connues
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        👉 <b>Solution</b> : demandez au client de corriger son adresse (format recommandé : <i>numéro, rue, code postal, ville</i>).
                                    </Text>
                                </Stack>
                            </Alert>
                        )}
                    </Stack>
                </Card>
            )}

            {/* ── No orders ── */}
            {selectedMenu && selectedMenu.orders.length === 0 && (
                <Alert color="gray" title="Aucune commande">Il n'y a pas encore de commande pour ce jour.</Alert>
            )}

            {/* ── Raw address list ── */}
            {selectedMenu && selectedMenu.orders.length > 0 && !routeResult && (
                <Card withBorder shadow="sm" radius="md" p="lg">
                    <Text fw={600} size="lg" mb="md">Adresses de livraison</Text>
                    <Stack gap="xs">
                        {selectedMenu.orders.map(order => {
                            const constraint = parseConstraint(order.notes);
                            return (
                                <Paper key={order.id} p="sm" withBorder>
                                    <Group align="flex-start">
                                        <IconMapPin size={16} color="gray" style={{ marginTop: 2 }} />
                                        <div style={{ flex: 1 }}>
                                            <Group gap="xs">
                                                <Text size="sm" fw={500}>{order.user.name || order.user.email}</Text>
                                                {constraint?.type === 'before' && (
                                                    <Badge size="xs" color="red" variant="light" leftSection={<IconClock size={10} />}>
                                                        avant {formatTime(constraint.time)}
                                                    </Badge>
                                                )}
                                                {constraint?.type === 'after' && (
                                                    <Badge size="xs" color="blue" variant="light" leftSection={<IconClock size={10} />}>
                                                        après {formatTime(constraint.time)}
                                                    </Badge>
                                                )}
                                            </Group>
                                            <Text size="xs" c="dimmed">{order.deliveryAddress}</Text>
                                            {order.notes?.includes('⏰') && (
                                                <Text size="xs" c="orange" fw={500} mt={4}>
                                                    {order.notes.split('\n').find(l => l.includes('⏰'))}
                                                </Text>
                                            )}
                                        </div>
                                    </Group>
                                </Paper>
                            );
                        })}
                    </Stack>
                </Card>
            )}

            {/* ── Optimized route ── */}
            {routeResult && (
                <Card withBorder shadow="sm" radius="md" p="lg" style={{ backgroundColor: '#f0f9ff' }}>
                    <Group mb="md" justify="space-between">
                        <Group>
                            <IconTruck size={24} color="#1971c2" />
                            <Text fw={700} size="xl" c="blue">Itinéraire Optimisé</Text>
                        </Group>
                        <Group gap="xs">
                            <Badge color="blue">{routeResult.stops.length} arrêts</Badge>
                            <Badge color="gray">~{routeResult.totalDuration} min</Badge>
                            <Badge color="violet">{formatDistance(routeResult.totalDistanceKm)}</Badge>
                            {routeResult.usingRealData
                                ? <Badge color="teal" leftSection={<span style={{ fontSize: 11 }}>{vehicleType === 'scooter' ? '🛵' : '🚗'}</span>}>
                                    {vehicleType === 'scooter' ? 'Scooter (×0.70)' : 'Voiture'}
                                </Badge>
                                : <Badge color="yellow">Estimation</Badge>
                            }
                            {routeResult.lateCount > 0 && (
                                <Badge color="red" leftSection={<IconAlertTriangle size={12} />}>
                                    {routeResult.lateCount} en retard
                                </Badge>
                            )}
                            {routeResult.tooEarlyCount > 0 && (
                                <Badge color="blue" leftSection={<IconClock size={12} />}>
                                    {routeResult.tooEarlyCount} trop tôt
                                </Badge>
                            )}
                        </Group>
                    </Group>

                    {routeResult.lateCount > 0 && (
                        <Alert color="red" icon={<IconAlertTriangle size={16} />} mb="md">
                            <Text size="sm">
                                <b>{routeResult.lateCount} livraison(s)</b> risquent d'arriver après la deadline (contrainte "avant X").
                                Partez plus tôt ou contactez ces clients.
                            </Text>
                        </Alert>
                    )}
                    {routeResult.tooEarlyCount > 0 && (
                        <Alert color="blue" icon={<IconClock size={16} />} mb="md">
                            <Text size="sm">
                                <b>{routeResult.tooEarlyCount} livraison(s)</b> arrivent avant la fenêtre du client (contrainte "après X").
                                Un temps d'attente sur place est indiqué pour chaque arrêt concerné.
                            </Text>
                        </Alert>
                    )}

                    <Stack gap={0}>
                        {/* Departure */}
                        <Paper p="md" withBorder style={{ backgroundColor: '#e7f5ff', borderColor: '#1971c2', borderWidth: 2 }}>
                            <Group justify="space-between">
                                <Group>
                                    <Badge size="lg" color="blue" variant="filled">DÉPART</Badge>
                                    <Group gap="xs">
                                        <IconHome size={18} color="#1971c2" />
                                        <Text fw={600} c="blue">Votre point de départ</Text>
                                    </Group>
                                </Group>
                                <Badge size="md" color="blue" variant="outline" leftSection={<IconClock size={12} />}>
                                    {formatTime(departureHour * 60 + departureMinute)}
                                </Badge>
                            </Group>
                        </Paper>

                        {routeResult.stops.map((stop, index) => (
                            <div key={stop.order.id}>
                                {/* Travel leg info */}
                                <div style={{ padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 2, height: 24, backgroundColor: '#dee2e6', margin: '0 15px' }} />
                                    <Text size="xs" c="dimmed">
                                        🚗 {stop.travelMinutes} min · {formatDistance(stop.distanceKm)}
                                    </Text>
                                </div>

                                <Paper p="md" withBorder style={{
                                    backgroundColor: stop.isLate ? '#fff5f5' : stop.isTooEarly ? '#eff8ff' : 'white',
                                    borderColor: stop.isLate ? '#fa5252' : stop.isTooEarly ? '#339af0' : stop.constraint !== null ? '#fd7e14' : '#dee2e6',
                                    borderWidth: (stop.isLate || stop.isTooEarly || stop.constraint !== null) ? 2 : 1,
                                }}>
                                    <Group justify="space-between" align="flex-start">
                                        <Group align="flex-start" style={{ flex: 1 }}>
                                            <Badge size="lg" color={stop.isLate ? 'red' : stop.isTooEarly ? 'blue' : 'gray'} variant="light">
                                                Arrêt {index + 1}
                                            </Badge>
                                            <div style={{ flex: 1 }}>
                                                <Group gap="xs" mb={2}>
                                                    <Text fw={500}>{stop.order.user.name || stop.order.user.email}</Text>
                                                    {stop.constraint?.type === 'before' && (
                                                        <Tooltip label={stop.isLate
                                                            ? `⚠️ Arrivée ~${formatTime(stop.estimatedArrival)} > deadline ${formatTime(stop.constraint.time)}`
                                                            : `✅ Dans les temps — deadline ${formatTime(stop.constraint.time)}, arrivée ~${formatTime(stop.estimatedArrival)}`
                                                        }>
                                                            <Badge size="xs" color={stop.isLate ? 'red' : 'green'} variant="filled"
                                                                leftSection={stop.isLate ? <IconAlertTriangle size={10} /> : <IconCheck size={10} />}
                                                                style={{ cursor: 'help' }}>
                                                                {stop.isLate ? 'En retard' : 'OK'} · avant {formatTime(stop.constraint.time)}
                                                            </Badge>
                                                        </Tooltip>
                                                    )}
                                                    {stop.constraint?.type === 'after' && (
                                                        <Tooltip label={stop.isTooEarly
                                                            ? `🕐 Arrivée ~${formatTime(stop.estimatedArrival)} — client disponible à partir de ${formatTime(stop.constraint.time)}. Attente ${stop.waitMinutes} min.`
                                                            : `✅ Arrivée ~${formatTime(stop.estimatedArrival)} — dans la fenêtre (après ${formatTime(stop.constraint.time)})`
                                                        }>
                                                            <Badge size="xs" color={stop.isTooEarly ? 'blue' : 'green'} variant="filled"
                                                                leftSection={stop.isTooEarly ? <IconClock size={10} /> : <IconCheck size={10} />}
                                                                style={{ cursor: 'help' }}>
                                                                {stop.isTooEarly ? `Attendre ${stop.waitMinutes} min` : 'OK'} · après {formatTime(stop.constraint.time)}
                                                            </Badge>
                                                        </Tooltip>
                                                    )}
                                                </Group>
                                                <Group gap="xs">
                                                    <IconMapPin size={14} color="gray" />
                                                    <Text size="sm" c="dimmed">{stop.order.deliveryAddress}</Text>
                                                </Group>
                                                {stop.order.notes?.includes('⏰') && (
                                                    <Text size="xs" c="orange" mt={4}>
                                                        {stop.order.notes.split('\n').find(l => l.includes('⏰'))}
                                                    </Text>
                                                )}
                                            </div>
                                        </Group>
                                        <div style={{ textAlign: 'right', minWidth: 110 }}>
                                            <Badge size="md" color={stop.isLate ? 'red' : stop.isTooEarly ? 'blue' : 'teal'} variant="outline"
                                                leftSection={<IconClock size={12} />}>
                                                ~{formatTime(stop.estimatedArrival)}
                                            </Badge>
                                            {stop.isTooEarly && (
                                                <Text size="xs" c="blue" mt={2}>⏳ Attente {stop.waitMinutes} min</Text>
                                            )}
                                            <Text size="xs" c="dimmed" mt={2}>+{handoverMin} min remise</Text>
                                        </div>
                                    </Group>
                                </Paper>
                            </div>
                        ))}

                        {/* Travel back + return */}
                        <div style={{ padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 2, height: 24, backgroundColor: '#dee2e6', margin: '0 15px' }} />
                            <Text size="xs" c="dimmed">🏠 Retour</Text>
                        </div>
                        <Paper p="md" withBorder style={{ backgroundColor: '#e7f5ff', borderColor: '#1971c2', borderWidth: 2 }}>
                            <Group justify="space-between">
                                <Group>
                                    <Badge size="lg" color="blue" variant="filled">RETOUR</Badge>
                                    <Group gap="xs">
                                        <IconHome size={18} color="#1971c2" />
                                        <Text fw={600} c="blue">Point de départ</Text>
                                    </Group>
                                </Group>
                                <Badge size="md" color="gray" variant="outline" leftSection={<IconClock size={12} />}>
                                    ~{formatTime(departureHour * 60 + departureMinute + routeResult.totalDuration)}
                                </Badge>
                            </Group>
                        </Paper>
                    </Stack>

                    <Divider my="md" />

                    <Alert icon={<IconCheck size={16} />} color={routeResult.lateCount > 0 ? 'orange' : 'green'} title="Récapitulatif">
                        <Text size="sm">
                            {routeResult.stops.length} livraison(s) ·{' '}
                            {formatDistance(routeResult.totalDistanceKm)} ·{' '}
                            Départ {formatTime(departureHour * 60 + departureMinute)} →{' '}
                            Fin ~{formatTime(departureHour * 60 + departureMinute + routeResult.totalDuration)}{' '}•{' '}
                            {routeResult.lateCount === 0 && routeResult.tooEarlyCount === 0
                                ? '✅ Toutes les contraintes horaires respectées'
                                : [
                                    routeResult.lateCount > 0 && `⚠️ ${routeResult.lateCount} livraison(s) en retard`,
                                    routeResult.tooEarlyCount > 0 && `🕐 ${routeResult.tooEarlyCount} livraison(s) avec attente sur place`,
                                ].filter(Boolean).join(' · ')
                            }
                        </Text>
                    </Alert>
                </Card>
            )}
        </Stack>
    );
}
