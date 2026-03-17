export type ZonePoint = { lat: number; lon: number };

/**
 * Ray casting algorithm — vérifie si un point est dans un polygon.
 * Fonctionne pour tout polygon convexe ou concave.
 */
export function pointInPolygon(lat: number, lon: number, polygon: ZonePoint[]): boolean {
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lon, yi = polygon[i].lat;
        const xj = polygon[j].lon, yj = polygon[j].lat;
        const intersect = ((yi > lat) !== (yj > lat)) &&
            (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
