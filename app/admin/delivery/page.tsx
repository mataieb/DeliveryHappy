import { Container, Title, Select, Button, Card, Stack, Text, Group, Badge, Divider, Alert } from '@mantine/core';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import { IconRoute, IconMapPin, IconHome, IconAlertCircle } from '@tabler/icons-react';
import { DeliveryRouteClient } from './DeliveryRouteClient';

export const dynamic = 'force-dynamic';

export default async function DeliveryRoutePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect("/");
    }

    // Get current week menus
    const today = dayjs();
    const startOfWeek = today.startOf('week').add(1, 'day').toDate();
    const endOfWeek = today.endOf('week').add(1, 'day').toDate();

    const weekMenus = await prisma.menu.findMany({
        where: {
            date: {
                gte: startOfWeek,
                lte: endOfWeek
            }
        },
        include: {
            orders: {
                where: {
                    status: {
                        not: 'CANCELLED'
                    }
                },
                select: {
                    id: true,
                    deliveryAddress: true,
                    notes: true,
                    user: {
                        select: { name: true, email: true }
                    }
                }
            }
        },
        orderBy: {
            date: 'asc'
        }
    });

    // Format menu options for select
    const menuOptions = weekMenus.map(menu => ({
        value: menu.id,
        label: `${dayjs(menu.date).format('dddd DD/MM/YYYY')} - ${menu.orders.length} commande(s)`,
        date: menu.date,
        orderCount: menu.orders.length
    }));

    return (
        <Container fluid>
            <Title order={2} mb="lg">Planification des Livraisons</Title>

            {menuOptions.length === 0 ? (
                <Alert icon={<IconAlertCircle size={16} />} title="Aucun menu" color="yellow">
                    Aucun menu n'est configuré pour cette semaine.
                </Alert>
            ) : (
                <DeliveryRouteClient menuOptions={menuOptions} weekMenus={weekMenus} />
            )}
        </Container>
    );
}
