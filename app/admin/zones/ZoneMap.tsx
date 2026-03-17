'use client';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import type { ZonePoint, DeliveryZoneRow } from './actions';

// Fix l'icône Leaflet cassée dans Next.js (webpack remplace les URLs par défaut)
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

function ClickHandler({
    isDrawing,
    onMapClick,
}: {
    isDrawing: boolean;
    onMapClick: (lat: number, lon: number) => void;
}) {
    useMapEvents({
        click(e) {
            if (isDrawing) {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
}

interface Props {
    zones: DeliveryZoneRow[];
    drawingPoints: ZonePoint[];
    isDrawing: boolean;
    onMapClick: (lat: number, lon: number) => void;
}

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

export default function ZoneMap({ zones, drawingPoints, isDrawing, onMapClick }: Props) {
    return (
        <MapContainer
            center={PARIS_CENTER}
            zoom={12}
            style={{
                height: '100%',
                width: '100%',
                cursor: isDrawing ? 'crosshair' : 'grab',
                borderRadius: '8px',
            }}
        >
            <FixLeafletIcons />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <ClickHandler isDrawing={isDrawing} onMapClick={onMapClick} />

            {/* Zones existantes */}
            {zones.map(zone => (
                <Polygon
                    key={zone.id}
                    positions={zone.polygon.map(p => [p.lat, p.lon] as [number, number])}
                    pathOptions={{
                        color: zone.color,
                        fillColor: zone.color,
                        fillOpacity: 0.25,
                        weight: 2,
                    }}
                >
                    <Popup>
                        <strong>{zone.name}</strong>
                        <br />
                        {zone.polygon.length} points
                        {zone.menuCount > 0 && (
                            <><br />{zone.menuCount} menu(s) associé(s)</>
                        )}
                    </Popup>
                </Polygon>
            ))}

            {/* Aperçu du dessin en cours */}
            {drawingPoints.length >= 2 && (
                <Polygon
                    positions={drawingPoints.map(p => [p.lat, p.lon] as [number, number])}
                    pathOptions={{
                        color: '#ff6b35',
                        fillColor: '#ff6b35',
                        fillOpacity: 0.15,
                        weight: 2,
                        dashArray: '8 4',
                    }}
                />
            )}

            {/* Marqueurs des points en cours de dessin */}
            {drawingPoints.map((point, i) => (
                <Marker key={i} position={[point.lat, point.lon]}>
                    <Popup>Point {i + 1}</Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
