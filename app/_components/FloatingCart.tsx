'use client';

import { useCart } from './CartContext';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { IconShoppingCart } from '@tabler/icons-react';

export function FloatingCart() {
    const { cart, totalItems, totalPrice } = useCart();
    const { status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    if (status !== 'authenticated' || totalItems === 0 || pathname === '/cart') return null;

    return (
        <button
            onClick={() => router.push('/cart')}
            aria-label={`Voir le panier — ${totalItems} article${totalItems > 1 ? 's' : ''}`}
            style={{
                position: 'fixed',
                bottom: 32,
                right: 32,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#4c6ef5',
                color: 'white',
                border: 'none',
                borderRadius: 50,
                padding: '14px 22px',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(76, 110, 245, 0.45)',
                fontSize: 15,
                fontWeight: 600,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(76, 110, 245, 0.6)';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(76, 110, 245, 0.45)';
            }}
        >
            <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <IconShoppingCart size={22} />
                <span style={{
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    backgroundColor: '#fa5252',
                    color: 'white',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                }}>
                    {totalItems}
                </span>
            </span>
            <span>Mon panier — <strong>{totalPrice.toFixed(2)} €</strong></span>
        </button>
    );
}
