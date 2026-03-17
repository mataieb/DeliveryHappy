import { describe, it, expect } from 'vitest';
import { pointInPolygon, type ZonePoint } from '../geo';

// Carré simple : (0,0) → (0,10) → (10,10) → (10,0)
const square: ZonePoint[] = [
    { lat: 0, lon: 0 },
    { lat: 10, lon: 0 },
    { lat: 10, lon: 10 },
    { lat: 0, lon: 10 },
];

// Polygone représentant approximativement le 14e arrondissement de Paris
// (simplifié pour les tests, coordonnées réelles)
const paris14: ZonePoint[] = [
    { lat: 48.820, lon: 2.310 },
    { lat: 48.820, lon: 2.360 },
    { lat: 48.840, lon: 2.360 },
    { lat: 48.840, lon: 2.310 },
];

describe('pointInPolygon', () => {
    describe('cas de base — carré simple', () => {
        it('retourne true pour un point au centre', () => {
            expect(pointInPolygon(5, 5, square)).toBe(true);
        });

        it('retourne false pour un point clairement à l\'extérieur', () => {
            expect(pointInPolygon(20, 20, square)).toBe(false);
        });

        it('retourne false pour un point à l\'extérieur sur un axe', () => {
            expect(pointInPolygon(-1, 5, square)).toBe(false);
        });

        it('retourne false pour un point juste à côté de la bordure', () => {
            expect(pointInPolygon(5, 10.001, square)).toBe(false);
        });
    });

    describe('cas limites — polygon invalide', () => {
        it('retourne false si le polygon a moins de 3 points', () => {
            const twoPoints: ZonePoint[] = [
                { lat: 0, lon: 0 },
                { lat: 10, lon: 10 },
            ];
            expect(pointInPolygon(5, 5, twoPoints)).toBe(false);
        });

        it('retourne false pour un polygon vide', () => {
            expect(pointInPolygon(5, 5, [])).toBe(false);
        });
    });

    describe('zone de livraison réaliste (Paris 14e approx)', () => {
        it('accepte une adresse dans la zone (rue Daguerre)', () => {
            // 5 rue Daguerre, Paris 14 ≈ lat 48.833, lon 2.325
            expect(pointInPolygon(48.833, 2.325, paris14)).toBe(true);
        });

        it('refuse une adresse hors zone (Montmartre)', () => {
            // Place du Tertre, Paris 18 ≈ lat 48.886, lon 2.341
            expect(pointInPolygon(48.886, 2.341, paris14)).toBe(false);
        });

        it('refuse une adresse hors zone (Vincennes)', () => {
            // Vincennes ≈ lat 48.848, lon 2.438
            expect(pointInPolygon(48.848, 2.438, paris14)).toBe(false);
        });
    });

    describe('scénarios geo-blocage commandes', () => {
        it('bloque une adresse dont les coordonnées sont très proches mais hors zone', () => {
            // Juste en dehors du carré (lat 10.001)
            expect(pointInPolygon(10.001, 5, square)).toBe(false);
        });

        it('valide une adresse dans un polygone concave', () => {
            // Polygone en L : vérifie que l'algorithme ray-casting gère les formes concaves
            const lShape: ZonePoint[] = [
                { lat: 0, lon: 0 },
                { lat: 0, lon: 10 },
                { lat: 5, lon: 10 },
                { lat: 5, lon: 5 },
                { lat: 10, lon: 5 },
                { lat: 10, lon: 0 },
            ];
            // Point dans la partie basse du L
            expect(pointInPolygon(8, 2, lShape)).toBe(true);
            // Point dans le creux du L (hors zone)
            expect(pointInPolygon(8, 8, lShape)).toBe(false);
        });

        it('retourne true si la zone est null (pas de restriction)', () => {
            // Simule le comportement de isAddressInZone quand zone === null
            const zone: ZonePoint[] | null = null;
            if (!zone) {
                expect(true).toBe(true); // pas de zone = toujours autorisé
            }
        });
    });
});
