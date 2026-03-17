'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

type AddressRow = {
    id: string;
    label: string;
    type: 'DOMICILE' | 'BUREAU';
    content: string;
    lat: number | null;
    lon: number | null;
    user: { name: string | null; email: string };
};

function FixLeafletIcons() {
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
    }, []);
    return null;
}

function makeIcon(color: string) {
    return L.divIcon({
        className: '',
        html: `<div style="
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: ${color};
            border: 2px solid white;
            box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10],
    });
}

const DOMICILE_ICON = () => makeIcon('#2f9e44');
const BUREAU_ICON = () => makeIcon('#1971c2');

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

export default function AddressesMap({ addresses }: { addresses: AddressRow[] }) {
    const geocoded = addresses.filter(a => a.lat && a.lon);

    return (
        <MapContainer
            center={PARIS_CENTER}
            zoom={12}
            style={{ height: '100%', width: '100%', borderRadius: '8px' }}
        >
            <FixLeafletIcons />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {geocoded.map(addr => (
                <Marker
                    key={addr.id}
                    position={[addr.lat!, addr.lon!]}
                    icon={addr.type === 'BUREAU' ? BUREAU_ICON() : DOMICILE_ICON()}
                >
                    <Popup>
                        <strong>{addr.user.name ?? addr.user.email}</strong><br />
                        <span style={{ color: addr.type === 'BUREAU' ? '#1971c2' : '#2f9e44' }}>
                            {addr.type === 'BUREAU' ? '🏢 Bureau' : '🏠 Domicile'}
                        </span> — {addr.label}<br />
                        <small>{addr.content}</small>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
