// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import {
    getCart,
    saveCart,
    clearCart,
    cartTotalItems,
    cartTotalPrice,
    generateCartId,
    Cart,
    CartItem,
} from '../cart';

// Avec l'environnement jsdom, window et localStorage sont disponibles nativement.

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
    cartId: 'test-id',
    menuItemId: 'item-1',
    menuItemName: 'Poulet rôti',
    menuItemCategory: 'MAIN',
    basePrice: 8.5,
    optionPrice: 0,
    totalPrice: 8.5,
    selectedOptions: [],
    ...overrides,
});

const makeCart = (items: CartItem[] = []): Cart => ({
    menuId: 'menu-1',
    menuDate: '2025-03-19T00:00:00.000Z',
    items,
});

describe('cart helpers', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('getCart', () => {
        it('retourne null si localStorage est vide', () => {
            expect(getCart()).toBeNull();
        });

        it('retourne null si la donnée JSON est corrompue', () => {
            localStorage.setItem('deliveryhappy_cart', '{invalid json');
            expect(getCart()).toBeNull();
        });

        it('retourne le panier parsé si présent', () => {
            const cart = makeCart([makeItem()]);
            localStorage.setItem('deliveryhappy_cart', JSON.stringify(cart));
            expect(getCart()).toEqual(cart);
        });
    });


    describe('saveCart', () => {
        it('enregistre un panier non vide', () => {
            const cart = makeCart([makeItem()]);
            saveCart(cart);
            expect(getCart()).toEqual(cart);
        });

        it('supprime le panier si la liste d\'items est vide', () => {
            const cart = makeCart([]);
            const item = makeItem();
            saveCart(makeCart([item])); // D'abord on sauvegarde un panier
            saveCart(cart);             // Puis on sauvegarde un panier vide
            expect(getCart()).toBeNull();
        });

        it('supprime le panier si null est passé', () => {
            saveCart(makeCart([makeItem()]));
            saveCart(null);
            expect(getCart()).toBeNull();
        });
    });

    describe('clearCart', () => {
        it('supprime le panier du localStorage', () => {
            saveCart(makeCart([makeItem()]));
            clearCart();
            expect(getCart()).toBeNull();
        });
    });
});

describe('cartTotalItems', () => {
    it('retourne 0 pour un panier null', () => {
        expect(cartTotalItems(null)).toBe(0);
    });

    it('retourne le nombre d\'éléments dans le panier', () => {
        const cart = makeCart([makeItem(), makeItem({ cartId: 'id-2' })]);
        expect(cartTotalItems(cart)).toBe(2);
    });
});

describe('cartTotalPrice', () => {
    it('retourne 0 pour un panier null', () => {
        expect(cartTotalPrice(null)).toBe(0);
    });

    it('additionne correctement les prix', () => {
        const cart = makeCart([
            makeItem({ totalPrice: 8.5 }),
            makeItem({ cartId: 'id-2', totalPrice: 3.0 }),
            makeItem({ cartId: 'id-3', totalPrice: 2.5 }),
        ]);
        expect(cartTotalPrice(cart)).toBeCloseTo(14.0);
    });
});

describe('generateCartId', () => {
    it('génère des IDs uniques', () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateCartId()));
        expect(ids.size).toBe(100);
    });

    it('retourne une chaîne non vide', () => {
        expect(generateCartId().length).toBeGreaterThan(0);
    });
});
