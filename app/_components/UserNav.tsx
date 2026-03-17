'use client';

import { Group, Button, Container, Menu, ActionIcon } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
    IconArrowLeft, IconShieldCheck, IconCalendar, IconReceipt, IconDashboard,
    IconUser, IconLogout, IconTruck, IconPackage, IconMapPins, IconChevronDown, IconHome
} from "@tabler/icons-react";

export function UserNav() {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const isMobile = useMediaQuery('(max-width: 48em)');

    // Hide on login/api pages
    if (pathname?.startsWith('/api') || pathname?.startsWith('/login')) return null;

    const isOrderPage = pathname?.startsWith('/order/');
    const isAdminPage = pathname?.startsWith('/admin');
    const isAdmin = session?.user?.role === 'ADMIN';
    const isAuthenticated = status === 'authenticated';

    const isLogistique = pathname?.startsWith('/admin/delivery') ||
        pathname?.startsWith('/admin/containers') ||
        pathname?.startsWith('/admin/zones') ||
        pathname?.startsWith('/admin/addresses');

    return (
        <div style={{ borderBottom: '1px solid #eee', backgroundColor: 'white', marginBottom: '20px' }}>
            <Container size="lg" py="md">
                {isOrderPage ? (
                    <Button component={Link} href="/menu" variant="subtle" leftSection={<IconArrowLeft size={16} />}>
                        Retour au menu (Annuler)
                    </Button>
                ) : isAdminPage ? (
                    // Admin navigation
                    <Group justify="space-between" wrap="nowrap">
                        <Group wrap="nowrap" gap="xs">
                            <Button size="sm" component={Link} href="/admin" variant={pathname === '/admin' ? 'filled' : 'subtle'} leftSection={<IconDashboard size={14} />}>
                                Dashboard
                            </Button>
                            <Button size="sm" component={Link} href="/admin/menus" variant={pathname?.startsWith('/admin/menus') ? 'filled' : 'subtle'} leftSection={<IconCalendar size={14} />}>
                                Menus
                            </Button>
                            <Button size="sm" component={Link} href="/admin/orders" variant={pathname?.startsWith('/admin/orders') ? 'filled' : 'subtle'} leftSection={<IconReceipt size={14} />}>
                                Commandes
                            </Button>

                            <Menu shadow="md" width={200}>
                                <Menu.Target>
                                    <Button
                                        size="sm"
                                        variant={isLogistique ? 'filled' : 'subtle'}
                                        rightSection={<IconChevronDown size={14} />}
                                    >
                                        Logistique
                                    </Button>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item component={Link} href="/admin/delivery" leftSection={<IconTruck size={14} />}>
                                        Livraisons
                                    </Menu.Item>
                                    <Menu.Item component={Link} href="/admin/containers" leftSection={<IconPackage size={14} />}>
                                        Contenants
                                    </Menu.Item>
                                    <Menu.Item component={Link} href="/admin/zones" leftSection={<IconMapPins size={14} />}>
                                        Zones
                                    </Menu.Item>
                                    <Menu.Item component={Link} href="/admin/addresses" leftSection={<IconHome size={14} />}>
                                        Adresses
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </Group>

                        <Group wrap="nowrap" gap="xs">
                            <Button
                                size="sm"
                                component={Link}
                                href="/menu"
                                variant="light"
                                color="blue"
                                leftSection={<IconUser size={14} />}
                            >
                                Vue Client
                            </Button>
                            {isAuthenticated && (
                                isMobile
                                    ? <ActionIcon size="md" variant="light" color="red" onClick={() => signOut()}><IconLogout size={16} /></ActionIcon>
                                    : <Button size="sm" variant="light" color="red" leftSection={<IconLogout size={14} />} onClick={() => signOut()}>Déconnexion</Button>
                            )}
                        </Group>
                    </Group>
                ) : (
                    // Client navigation
                    <Group justify="space-between" wrap="wrap" gap="xs">
                        <Group wrap="wrap" gap="xs">
                            <Button size="sm" component={Link} href="/menu" variant={pathname === '/menu' ? 'filled' : 'subtle'}>
                                Menu
                            </Button>
                            <Button size="sm" component={Link} href="/orders" variant={pathname === '/orders' ? 'filled' : 'subtle'}>
                                Commandes
                            </Button>
                            <Button size="sm" component={Link} href="/preferences" variant={pathname === '/preferences' ? 'filled' : 'subtle'}>
                                Préférences
                            </Button>
                        </Group>

                        <Group wrap="nowrap" gap="xs">
                            {isAdmin && (
                                <Button
                                    size="sm"
                                    component={Link}
                                    href="/admin"
                                    variant="light"
                                    color="orange"
                                    leftSection={<IconShieldCheck size={14} />}
                                >
                                    Admin
                                </Button>
                            )}

                            {isAuthenticated && (
                                isMobile
                                    ? <ActionIcon size="md" variant="light" color="red" onClick={() => signOut()}><IconLogout size={16} /></ActionIcon>
                                    : <Button size="sm" variant="light" color="red" leftSection={<IconLogout size={14} />} onClick={() => signOut()}>Déconnexion</Button>
                            )}
                        </Group>
                    </Group>
                )}
            </Container>
        </div>
    );
}
