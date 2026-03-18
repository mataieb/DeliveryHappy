import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const plainToken = searchParams.get("token");

    if (!plainToken) {
        return NextResponse.redirect(`${APP_URL}/login?error=InvalidToken`);
    }

    const hashedToken = crypto.createHash("sha256").update(plainToken).digest("hex");

    const record = await prisma.verificationToken.findUnique({
        where: { token: hashedToken },
    });

    // Token not found
    if (!record) {
        return NextResponse.redirect(`${APP_URL}/login?error=InvalidToken`);
    }

    // Token expired — clean it up
    if (record.expires < new Date()) {
        await prisma.verificationToken.delete({ where: { token: hashedToken } });
        return NextResponse.redirect(`${APP_URL}/login?error=TokenExpired`);
    }

    // Mark user as verified and delete the token in a transaction
    await prisma.$transaction([
        prisma.user.update({
            where: { email: record.identifier },
            data: { emailVerified: new Date() },
        }),
        prisma.verificationToken.delete({ where: { token: hashedToken } }),
    ]);

    return NextResponse.redirect(`${APP_URL}/login?verified=true`);
}
