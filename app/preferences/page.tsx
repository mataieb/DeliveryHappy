import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PreferencesClient from "./PreferencesClient";

export const dynamic = 'force-dynamic';

export default async function PreferencesPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/api/auth/signin");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { addresses: true },
    });

    if (!user) {
        redirect("/api/auth/signin");
    }

    return (
        <PreferencesClient
            user={{
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                containerBalance: user.containerBalance,
                defaultPackaging: user.defaultPackaging,
                emailMenuWeekly: user.emailMenuWeekly,
                emailPromo: user.emailPromo,
                dietaryPreferences: user.dietaryPreferences,
                addresses: user.addresses,
                hasPassword: !!user.password,
            }}
        />
    );
}
