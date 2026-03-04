import { ItemCategory } from "@prisma/client";

export interface CartItemOption {
    groupId: string;
    groupName: string;
    selection: string | string[]; // optionId or optionIds
    selectionLabels: string[]; // human-readable names
    additionalPrice: number;
}

export interface CartItem {
    cartId: string; // unique per cart entry (nanoid/uuid)
    menuItemId: string;
    menuItemName: string;
    menuItemCategory: ItemCategory;
    basePrice: number;
    optionPrice: number; // sum of selected options price
    totalPrice: number; // basePrice + optionPrice
    selectedOptions: CartItemOption[]; // array of selected option groups
    // Stored as JSON-compatible form for createOrderAction:
    selectedOptionsRaw?: Record<string, string | string[]>;
}

export interface Cart {
    menuId: string;
    menuDate: string; // ISO string, for display
    items: CartItem[];
}

const CART_KEY = "deliveryhappy_cart";

export function getCart(): Cart | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(CART_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveCart(cart: Cart | null): void {
    if (typeof window === "undefined") return;
    if (!cart || cart.items.length === 0) {
        localStorage.removeItem(CART_KEY);
    } else {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
}

export function clearCart(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CART_KEY);
}

export function cartTotalItems(cart: Cart | null): number {
    return cart?.items.length ?? 0;
}

export function cartTotalPrice(cart: Cart | null): number {
    return cart?.items.reduce((sum, item) => sum + item.totalPrice, 0) ?? 0;
}

/** Generate a simple unique ID for each cart entry */
export function generateCartId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
