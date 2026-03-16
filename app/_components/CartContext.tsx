'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { Cart, CartItem, getCart, saveCart, clearCart, cartTotalItems, cartTotalPrice } from '@/lib/cart';

interface CartContextValue {
    cart: Cart | null;
    totalItems: number;
    totalPrice: number;
    addItem: (menuId: string, menuDate: string, item: CartItem) => 'added' | 'wrong_day';
    removeItem: (cartId: string) => void;
    clearCurrentCart: () => void;
    switchCart: (menuId: string, menuDate: string, item: CartItem) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const [cart, setCart] = useState<Cart | null>(null);

    // Load cart from localStorage on mount
    useEffect(() => {
        setCart(getCart());
    }, []);

    // Clear cart on logout
    useEffect(() => {
        if (status === 'unauthenticated') {
            clearCart();
            setCart(null);
        }
    }, [status]);

    // Persist cart to localStorage whenever it changes
    useEffect(() => {
        saveCart(cart);
    }, [cart]);

    const addItem = useCallback((menuId: string, menuDate: string, item: CartItem): 'added' | 'wrong_day' => {
        if (cart && cart.menuId !== menuId && cart.items.length > 0) {
            return 'wrong_day';
        }

        setCart(prev => {
            if (!prev || prev.items.length === 0) {
                return { menuId, menuDate, items: [item] };
            }
            return { ...prev, items: [...prev.items, item] };
        });
        return 'added';
    }, [cart]);

    const removeItem = useCallback((cartId: string) => {
        setCart(prev => {
            if (!prev) return null;
            const newItems = prev.items.filter(i => i.cartId !== cartId);
            if (newItems.length === 0) return null;
            return { ...prev, items: newItems };
        });
    }, []);

    const clearCurrentCart = useCallback(() => {
        clearCart();
        setCart(null);
    }, []);

    /** Replace cart with a new day's item (called after user confirms switching day) */
    const switchCart = useCallback((menuId: string, menuDate: string, item: CartItem) => {
        const newCart: Cart = { menuId, menuDate, items: [item] };
        setCart(newCart);
    }, []);

    return (
        <CartContext.Provider value={{
            cart,
            totalItems: cartTotalItems(cart),
            totalPrice: cartTotalPrice(cart),
            addItem,
            removeItem,
            clearCurrentCart,
            switchCart,
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within a CartProvider');
    return ctx;
}
