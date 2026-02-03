'use client';

import { Group, Button, Container } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";

export function UserNav() {
    const pathname = usePathname();

    // Hide on admin pages or login
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/api')) return null;

    const isOrderPage = pathname?.startsWith('/order/');

    return (
        <div style={{ borderBottom: '1px solid #eee', backgroundColor: 'white', marginBottom: '20px' }}>
            <Container size="lg" py="md">
                {isOrderPage ? (
                    <Button component={Link} href="/menu" variant="subtle" leftSection={<IconArrowLeft size={16} />}>
                        Retour au menu (Annuler)
                    </Button>
                ) : (
                    <Group>
                        <Button component={Link} href="/menu" variant={pathname === '/menu' ? 'filled' : 'subtle'}>
                            Menu de la semaine
                        </Button>
                        <Button component={Link} href="/orders" variant={pathname === '/orders' ? 'filled' : 'subtle'}>
                            Mes Commandes
                        </Button>
                        <Button component={Link} href="/preferences" variant={pathname === '/preferences' ? 'filled' : 'subtle'}>
                            Mes Préférences
                        </Button>
                    </Group>
                )}
            </Container>
        </div>
    );
}
