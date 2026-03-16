import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isOrderingOpen, orderingDeadline } from '../ordering';

describe('isOrderingOpen', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('retourne true si on est avant 21h la veille', () => {
        // Menu du mercredi 19 mars 2025 → deadline mardi 18 mars à 21h
        const menuDate = new Date('2025-03-19T12:00:00');
        // On simule qu'on est mardi 18 mars à 20h59
        vi.setSystemTime(new Date('2025-03-18T20:59:00'));
        expect(isOrderingOpen(menuDate)).toBe(true);
    });

    it('retourne false si on est exactement à 21h la veille', () => {
        const menuDate = new Date('2025-03-19T12:00:00');
        vi.setSystemTime(new Date('2025-03-18T21:00:00'));
        expect(isOrderingOpen(menuDate)).toBe(false);
    });

    it('retourne false si on est après 21h la veille', () => {
        const menuDate = new Date('2025-03-19T12:00:00');
        vi.setSystemTime(new Date('2025-03-18T21:30:00'));
        expect(isOrderingOpen(menuDate)).toBe(false);
    });

    it('retourne false si on est le jour même du menu', () => {
        const menuDate = new Date('2025-03-19T12:00:00');
        vi.setSystemTime(new Date('2025-03-19T08:00:00'));
        expect(isOrderingOpen(menuDate)).toBe(false);
    });

    it('retourne false si le menu est déjà passé', () => {
        const menuDate = new Date('2025-03-10T12:00:00');
        vi.setSystemTime(new Date('2025-03-19T10:00:00'));
        expect(isOrderingOpen(menuDate)).toBe(false);
    });

    it('retourne true bien à l\'avance (plusieurs jours avant)', () => {
        const menuDate = new Date('2025-03-21T12:00:00'); // vendredi
        vi.setSystemTime(new Date('2025-03-17T10:00:00')); // lundi
        expect(isOrderingOpen(menuDate)).toBe(true);
    });
});

describe('orderingDeadline', () => {
    it('retourne un string non vide', () => {
        const menuDate = new Date('2025-03-19T12:00:00');
        const result = orderingDeadline(menuDate);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it('contient "21" (l\'heure de fermeture)', () => {
        const menuDate = new Date('2025-03-19T12:00:00');
        const result = orderingDeadline(menuDate);
        expect(result).toContain('21');
    });

    it('la deadline est bien le jour AVANT la date du menu', () => {
        // Menu du mercredi, deadline doit mentionner mardi
        const menuDate = new Date('2025-03-19T12:00:00'); // mercredi
        const result = orderingDeadline(menuDate);
        // En fr-FR, mardi = "mardi"
        expect(result.toLowerCase()).toContain('mardi');
    });
});
