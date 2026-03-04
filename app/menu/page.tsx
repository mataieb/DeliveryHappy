import { Container, Title } from "@mantine/core";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import dayjs from "dayjs";
import MenuList from "./_components/MenuList";

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/api/auth/signin");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { addresses: true }
    });

    if (user && (!user.phoneNumber || user.addresses.length === 0)) {
        redirect("/preferences?onboarding=true");
    }

    // Get start and end of current week (Monday to Sunday)
    const today = dayjs();
    const startOfWeek = today.startOf('week').add(1, 'day').toDate(); // Monday
    const endOfWeek = today.endOf('week').add(1, 'day').toDate(); // Sunday

    const menus = await prisma.menu.findMany({
        where: {
            date: {
                gte: startOfWeek,
                lte: endOfWeek
            }
        },
        include: {
            items: {
                include: {
                    optionGroups: {
                        include: { options: true }
                    }
                }
            }
        },
        orderBy: {
            date: 'asc'
        }
    });

    return (
        <Container size="lg" py="xl">
            <Title mb="xl">Menu de la semaine</Title>
            <MenuList menus={menus} />
        </Container>
    );
}
