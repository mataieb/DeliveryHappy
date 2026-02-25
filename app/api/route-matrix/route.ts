import { NextRequest, NextResponse } from 'next/server';

// OSRM (Open Source Routing Machine) — free, no key required
// Public instance: router.project-osrm.org
// Table API gives us a full N×N matrix of travel durations in seconds
const OSRM_BASE = 'https://router.project-osrm.org/table/v1/driving';

interface Coordinate {
    lat: number;
    lon: number;
}

export async function POST(req: NextRequest) {
    try {
        const { coordinates } = await req.json() as { coordinates: Coordinate[] };

        if (!coordinates || coordinates.length < 2) {
            return NextResponse.json({ error: 'At least 2 coordinates required' }, { status: 400 });
        }

        // OSRM expects: lon,lat;lon,lat;...
        const coordString = coordinates
            .map(c => `${c.lon},${c.lat}`)
            .join(';');

        const url = `${OSRM_BASE}/${coordString}?annotations=duration,distance`;

        const res = await fetch(url, {
            headers: { 'User-Agent': 'MaitreTaiebsKitchen/1.0' },
        });

        if (!res.ok) {
            return NextResponse.json({ error: 'OSRM request failed' }, { status: 502 });
        }

        const data = await res.json();

        if (data.code !== 'Ok') {
            return NextResponse.json({ error: `OSRM error: ${data.code}` }, { status: 502 });
        }

        // durations[i][j] = travel time in seconds from point i to point j
        // distances[i][j] = distance in meters
        return NextResponse.json({
            durations: data.durations,   // seconds
            distances: data.distances,   // meters
        });
    } catch (error) {
        console.error('Route matrix error:', error);
        return NextResponse.json({ error: 'Route matrix calculation failed' }, { status: 500 });
    }
}
