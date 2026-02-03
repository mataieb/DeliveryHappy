import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PreferencesClient from "./PreferencesClient";

export const dynamic = 'force-dynamic';

export default async function PreferencesPage() {
    const session = await getServerSession(authOptions);

    // If no session, redirect to login
    if (!session?.user?.id) {
        redirect("/api/auth/signin"); // Or proper login page
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { addresses: true },
    });

    if (!user) {
        // Should not happen if session exists but user deleted
        redirect("/api/auth/signin");
    }

    return <PreferencesClient user={user} />;
}
