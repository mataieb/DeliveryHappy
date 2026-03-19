import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();
        const normalizedEmail = (email ?? "").toLowerCase().trim();

        if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return NextResponse.json({ error: "Email invalide." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        // Toujours retourner succès pour ne pas révéler si l'email existe
        if (!user || !user.password) {
            return NextResponse.json({ success: true });
        }

        // Générer et stocker le token
        const plainToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(plainToken).digest("hex");
        const expires = new Date(Date.now() + TOKEN_TTL_MS);
        const identifier = `reset:${normalizedEmail}`;

        await prisma.verificationToken.deleteMany({ where: { identifier } });
        await prisma.verificationToken.create({
            data: { identifier, token: hashedToken, expires },
        });

        await sendPasswordResetEmail(normalizedEmail, user.name ?? normalizedEmail, plainToken);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[forgot-password]", error);
        return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
    }
}
