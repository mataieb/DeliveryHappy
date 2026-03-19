import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;

export async function POST(req: NextRequest) {
    try {
        const { email, token, password } = await req.json();
        const normalizedEmail = (email ?? "").toLowerCase().trim();

        if (!normalizedEmail || !token || !password) {
            return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
        }

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        const identifier = `reset:${normalizedEmail}`;

        const record = await prisma.verificationToken.findUnique({
            where: { identifier_token: { identifier, token: hashedToken } },
        });

        if (!record) {
            return NextResponse.json({ error: "Lien invalide ou déjà utilisé." }, { status: 400 });
        }

        if (record.expires < new Date()) {
            await prisma.verificationToken.delete({ where: { identifier_token: { identifier, token: hashedToken } } });
            return NextResponse.json({ error: "Ce lien a expiré. Faites une nouvelle demande." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
        }

        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        await prisma.$transaction([
            prisma.user.update({
                where: { email: normalizedEmail },
                data: { password: hashedPassword },
            }),
            prisma.verificationToken.delete({
                where: { identifier_token: { identifier, token: hashedToken } },
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[reset-password]", error);
        return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
    }
}
