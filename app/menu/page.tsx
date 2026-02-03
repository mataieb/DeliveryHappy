import { Container, Title, Text } from "@mantine/core";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import dayjs from "dayjs";
import MenuList from "./_components/MenuList";

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
            <Title mb="xl">Lunch Menu</Title>
            {session && <Text mb="lg">Welcome {session.user?.name}</Text>}
            <MenuList menus={menus} />
        </Container>
    );
}
