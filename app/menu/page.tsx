import { Container, Title, Alert, Group, Text } from "@mantine/core";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import dayjs from "dayjs";
import MenuList from "./_components/MenuList";
import { pointInPolygon, type ZonePoint } from "@/lib/geo";
import Link from "next/link";
import { IconClipboardList } from "@tabler/icons-react";

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/api/auth/signin");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { addresses: { select: { id: true, label: true, content: true, lat: true, lon: true } } }
    });

    if (user && (!user.phoneNumber || user.addresses.length === 0)) {
        redirect("/preferences?onboarding=true");
    }

    const today = dayjs();
    const startOfWeek = today.startOf('week').add(1, 'day').toDate();
    const endOfWeek = today.endOf('week').add(8, 'day').toDate(); // 2 semaines

    const openPolls = await prisma.poll.findMany({
        where: { status: 'OPEN' },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
    });

    const menus = await prisma.menu.findMany({
        where: { date: { gte: startOfWeek, lte: endOfWeek } },
        include: {
            items: {
                include: { optionGroups: { include: { options: true } } }
            },
            deliveryZone: {
                select: { name: true, polygon: true }
            },
        },
        orderBy: { date: 'asc' }
    });

    // Pour chaque menu avec une zone, calculer si l'utilisateur a AU MOINS une adresse valide
    const userAddresses = user?.addresses ?? [];
    const zoneStatusByMenuId: Record<string, 'blocked' | 'partial' | 'no_coords' | null> = {};
    const validAddressLabelsByMenuId: Record<string, string[]> = {};

    for (const menu of menus) {
        if (!menu.deliveryZone) {
            zoneStatusByMenuId[menu.id] = null;
            validAddressLabelsByMenuId[menu.id] = [];
            continue;
        }
        const polygon = menu.deliveryZone.polygon as ZonePoint[];
        const addressesWithCoords = userAddresses.filter(a => a.lat && a.lon);

        if (addressesWithCoords.length === 0) {
            zoneStatusByMenuId[menu.id] = 'no_coords';
            validAddressLabelsByMenuId[menu.id] = [];
        } else {
            const validAddresses = addressesWithCoords.filter(a =>
                pointInPolygon(a.lat!, a.lon!, polygon)
            );

            validAddressLabelsByMenuId[menu.id] = validAddresses.map(a => a.content);

            if (validAddresses.length === 0) {
                zoneStatusByMenuId[menu.id] = 'blocked';
            } else if (validAddresses.length < userAddresses.length) {
                zoneStatusByMenuId[menu.id] = 'partial';
            } else {
                zoneStatusByMenuId[menu.id] = null;
            }
        }
    }

    return (
        <Container size="lg" pt="xs" pb={{ base: 120, sm: 100 }}>
            {openPolls.map((poll: { id: string; title: string }) => (
                <Link key={poll.id} href={`/polls/${poll.id}`} style={{ textDecoration: 'none' }}>
                    <Alert
                        icon={<IconClipboardList size={18} />}
                        color="blue"
                        mb="md"
                        style={{ cursor: 'pointer' }}
                    >
                        <Group justify="space-between" wrap="nowrap">
                            <Text size="sm" fw={500}>{poll.title}</Text>
                            <Text size="xs" c="blue">Voter →</Text>
                        </Group>
                    </Alert>
                </Link>
            ))}
            <Title order={3} mb="md">Menus</Title>
            <MenuList menus={menus} zoneStatusByMenuId={zoneStatusByMenuId} validAddressLabelsByMenuId={validAddressLabelsByMenuId} />
        </Container>
    );
}
