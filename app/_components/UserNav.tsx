'use client';

import { Group, Button, Container } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { IconArrowLeft, IconShieldCheck, IconCalendar, IconReceipt, IconDashboard, IconUser, IconLogout, IconTruck, IconPackage } from "@tabler/icons-react";

export function UserNav() {
    const pathname = usePathname();
    const { data: session } = useSession();

    // Hide on login/api pages
    if (pathname?.startsWith('/api')) return null;

    const isOrderPage = pathname?.startsWith('/order/');
    const isAdminPage = pathname?.startsWith('/admin');
    const isAdmin = session?.user?.role === 'ADMIN';

    return (
        <div style={{ borderBottom: '1px solid #eee', backgroundColor: 'white', marginBottom: '20px' }}>
            <Container size="lg" py="md">
                {isOrderPage ? (
                    <Button component={Link} href="/menu" variant="subtle" leftSection={<IconArrowLeft size={16} />}>
                        Retour au menu (Annuler)
                    </Button>
                ) : isAdminPage ? (
                    // Admin navigation
                    <Group justify="space-between">
                        <Group>
                            <Button component={Link} href="/admin" variant={pathname === '/admin' ? 'filled' : 'subtle'} leftSection={<IconDashboard size={16} />}>
                                Dashboard
                            </Button>
                            <Button component={Link} href="/admin/menus" variant={pathname?.startsWith('/admin/menus') ? 'filled' : 'subtle'} leftSection={<IconCalendar size={16} />}>
                                Gestion des Menus
                            </Button>
                            <Button component={Link} href="/admin/orders" variant={pathname?.startsWith('/admin/orders') ? 'filled' : 'subtle'} leftSection={<IconReceipt size={16} />}>
                                Commandes
                            </Button>
                            <Button component={Link} href="/admin/delivery" variant={pathname?.startsWith('/admin/delivery') ? 'filled' : 'subtle'} leftSection={<IconTruck size={16} />}>
                                Livraisons
                            </Button>
                            <Button component={Link} href="/admin/containers" variant={pathname?.startsWith('/admin/containers') ? 'filled' : 'subtle'} leftSection={<IconPackage size={16} />}>
                                Contenants
                            </Button>
                        </Group>

                        <Group>
                            <Button
                                component={Link}
                                href="/menu"
                                variant="light"
                                color="blue"
                                leftSection={<IconUser size={16} />}
                            >
                                Vue Client
                            </Button>
                            <Button
                                variant="light"
                                color="red"
                                leftSection={<IconLogout size={16} />}
                                onClick={() => signOut()}
                            >
                                Déconnexion
                            </Button>
                        </Group>
                    </Group>
                ) : (
                    // Client navigation
                    <Group justify="space-between">
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

                        <Group>
                            {isAdmin && (
                                <Button
                                    component={Link}
                                    href="/admin"
                                    variant="light"
                                    color="orange"
                                    leftSection={<IconShieldCheck size={16} />}
                                >
                                    Back Office
                                </Button>
                            )}
                            <Button
                                variant="light"
                                color="red"
                                leftSection={<IconLogout size={16} />}
                                onClick={() => signOut()}
                            >
                                Déconnexion
                            </Button>
                        </Group>
                    </Group>
                )}
            </Container>
        </div>
    );
}
