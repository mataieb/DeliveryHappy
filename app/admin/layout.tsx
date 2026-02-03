'use client';

import { AppShell, Burger, Group, NavLink, Text, useMantineTheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCalendar, IconDashboard, IconLogout, IconReceipt } from '@tabler/icons-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [opened, { toggle }] = useDisclosure();
    const theme = useMantineTheme();
    const pathname = usePathname();

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{
                width: 300,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md">
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <Text fw={700} size="lg">Cantine Admin</Text>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <NavLink
                    label="Dashboard"
                    leftSection={<IconDashboard size="1rem" stroke={1.5} />}
                    component={Link}
                    href="/admin"
                    active={pathname === '/admin'}
                />
                <NavLink
                    label="Gestion desMenus"
                    leftSection={<IconCalendar size="1rem" stroke={1.5} />}
                    component={Link}
                    href="/admin/menus"
                    active={pathname.startsWith('/admin/menus')}
                />
                <NavLink
                    label="Commandes"
                    leftSection={<IconReceipt size="1rem" stroke={1.5} />}
                    component={Link}
                    href="/admin/orders"
                    active={pathname.startsWith('/admin/orders')}
                />

                <NavLink
                    label="Déconnexion"
                    leftSection={<IconLogout size="1rem" stroke={1.5} />}
                    onClick={() => signOut()}
                    mt="auto"
                    variant="subtle"
                    color="red"
                />
            </AppShell.Navbar>

            <AppShell.Main>
                {children}
            </AppShell.Main>
        </AppShell>
    );
}
