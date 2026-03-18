import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Exported for unit testing
export async function authorizeCredentials(
    credentials: { email: string; password: string } | undefined
) {
    if (!credentials?.email || !credentials?.password) return null;

    const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase().trim() },
    });

    // No user or no password (Google-only account) → generic error
    if (!user || !user.password) return null;

    const passwordMatch = await bcrypt.compare(credentials.password, user.password);
    if (!passwordMatch) return null;

    // Block login until email is verified
    if (!user.emailVerified) {
        throw new Error("EmailNotVerified");
    }

    return user;
}

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Mot de passe", type: "password" },
            },
            authorize: authorizeCredentials,
        }),
    ],
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as any;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
