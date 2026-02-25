import { NextRequest, NextResponse } from 'next/server';

// Nominatim (OpenStreetMap) geocoding API — free, no key required
// Rate limit: 1 request/second — we geocode server-side to control this
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'MaitreTaiebsKitchen/1.0 (lunch-ordering-app)';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
    try {
        const { addresses } = await req.json() as { addresses: string[] };

        if (!addresses || !Array.isArray(addresses)) {
            return NextResponse.json({ error: 'addresses array required' }, { status: 400 });
        }

        const results: Array<{ address: string; lat: number | null; lon: number | null; display: string }> = [];

        for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i];

            const params = new URLSearchParams({
                q: address,
                format: 'json',
                limit: '1',
                addressdetails: '1',
            });

            const res = await fetch(`${NOMINATIM_URL}?${params}`, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept-Language': 'fr',
                },
            });

            if (!res.ok) {
                results.push({ address, lat: null, lon: null, display: address });
                continue;
            }

            const data = await res.json();

            if (data.length > 0) {
                results.push({
                    address,
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon),
                    display: data[0].display_name,
                });
            } else {
                results.push({ address, lat: null, lon: null, display: address });
            }

            // Respect Nominatim rate limit: 1 req/sec
            if (i < addresses.length - 1) {
                await sleep(1100);
            }
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Geocoding error:', error);
        return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
    }
}
