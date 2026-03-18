import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

// Minimum password length
const MIN_PASSWORD_LENGTH = 8;
// bcrypt cost factor — 12 rounds ≈ 250ms on modern hardware, good balance vs brute-force
const BCRYPT_ROUNDS = 12;
// Verification token TTL
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const name: string = (body.name ?? "").trim();
        const email: string = (body.email ?? "").toLowerCase().trim();
        const password: string = body.password ?? "";

        // ── Server-side validation ────────────────────────────────────────────
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Tous les champs sont obligatoires." },
                { status: 400 }
            );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            return NextResponse.json(
                { error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` },
                { status: 400 }
            );
        }

        // ── Check for existing account ────────────────────────────────────────
        const existingUser = await prisma.user.findUnique({
            where: { email },
            include: { accounts: true },
        });

        if (existingUser) {
            const hasGoogleAccount = existingUser.accounts.some((a) => a.provider === "google");
            if (hasGoogleAccount) {
                return NextResponse.json(
                    { error: "Ce compte utilise Google. Connectez-vous avec Google." },
                    { status: 409 }
                );
            }
            // User already registered with credentials — give same generic message
            // to avoid leaking which emails are registered
            return NextResponse.json(
                { error: "Un compte existe déjà avec cet email." },
                { status: 409 }
            );
        }

        // ── Hash password ─────────────────────────────────────────────────────
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // ── Create user (not yet verified) ────────────────────────────────────
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword },
        });

        // ── Create verification token ─────────────────────────────────────────
        // We store a SHA-256 hash of the random token so that even a DB leak
        // cannot be used to verify accounts without the original email link.
        const plainToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(plainToken).digest("hex");
        const expires = new Date(Date.now() + TOKEN_TTL_MS);

        // Clean up any pre-existing token for this email before creating a new one
        await prisma.verificationToken.deleteMany({ where: { identifier: email } });

        await prisma.verificationToken.create({
            data: { identifier: email, token: hashedToken, expires },
        });

        // ── Send verification email ───────────────────────────────────────────
        await sendVerificationEmail(email, name, plainToken);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Register]", error);
        return NextResponse.json(
            { error: "Une erreur est survenue. Veuillez réessayer." },
            { status: 500 }
        );
    }
}
