import { Container, Title, Text, Group, Button } from "@mantine/core";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import dayjs from "dayjs";
import MenuList from "./_components/MenuList";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
    const session = await getServerSession(authOptions);

    // NOTE: Validation disabled for development viewing
    // if (!session) {
    //   redirect("/login");
    // }

    const today = dayjs().startOf('day').toDate();
    const menus = await prisma.menu.findMany({
        where: {
            date: {
                gte: today
            }
        },
        include: {
            items: true
        },
        orderBy: {
            date: 'asc'
        },
        take: 3
    });

    return (
        <Container size="lg" py="xl">
            <Group justify="space-between" mb="xl">
                <Title>Lunch Menu</Title>
                {session && (
                    <Link href="/preferences" style={{ textDecoration: 'none' }}>
                        <Button component="span" variant="light" size="xs">
                            Mes Préférences
                        </Button>
                    </Link>
                )}
            </Group>
            {session && <Text mb="lg">Bonjour {session.user?.name || 'Gourmand'}</Text>}
            <MenuList menus={menus} />
        </Container>
    );
}
