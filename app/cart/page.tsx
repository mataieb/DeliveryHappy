import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CartClient from "./CartClient";
import { getAllSettingsAction } from "@/app/admin/settings/actions";

export const dynamic = 'force-dynamic';

export default async function CartPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/api/auth/signin");

    const [user, settings] = await Promise.all([
        prisma.user.findUnique({
            where: { id: session.user.id },
            include: { addresses: true },
        }),
        getAllSettingsAction(),
    ]);

    if (!user) redirect("/api/auth/signin");

    // @ts-ignore
    const currentBalance = user.containerBalance || 0;

    return (
        <CartClient
            addresses={user.addresses}
            containerBalance={currentBalance}
            userPhoneNumber={user.phoneNumber}
            tupperwareEnabled={settings.tupperwareEnabled}
        />
    );
}
