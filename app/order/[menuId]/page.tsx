import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import OrderClient from "./OrderClient";

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ menuId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/api/auth/signin");

    const { menuId } = await params;

    const menu = await prisma.menu.findUnique({
        where: { id: menuId },
        include: { items: true },
    });

    if (!menu) notFound();

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { addresses: true },
    });

    if (!user) redirect("/api/auth/signin");

    return <OrderClient menu={menu} addresses={user.addresses} />;
}
