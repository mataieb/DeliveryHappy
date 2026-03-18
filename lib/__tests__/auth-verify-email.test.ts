import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
    prisma: {
        verificationToken: {
            findUnique: vi.fn(),
            delete: vi.fn(),
        },
        user: {
            update: vi.fn(),
        },
        $transaction: vi.fn(),
    },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { GET } from '@/app/api/auth/verify-email/route';
import { prisma } from '@/lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(token?: string) {
    const url = token
        ? `http://localhost/api/auth/verify-email?token=${token}`
        : 'http://localhost/api/auth/verify-email';
    return new NextRequest(url, { method: 'GET' });
}

function hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Un token factice valide : 32 bytes = 64 hex chars
const PLAIN_TOKEN = 'a1b2c3d4'.repeat(8);
const HASHED_TOKEN = hashToken(PLAIN_TOKEN);
const FUTURE_DATE = new Date(Date.now() + 60 * 60 * 1000); // expires in 1h
const PAST_DATE = new Date(Date.now() - 1000); // expired 1s ago

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/auth/verify-email', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // $transaction reçoit un tableau de promesses → on les résout toutes
        (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
            (ops: Promise<unknown>[]) => Promise.all(ops)
        );
        (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
        (prisma.verificationToken.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    });

    // ── Token absent ou invalide ──────────────────────────────────────────────

    describe('token absent ou invalide', () => {
        it('redirige vers /login?error=InvalidToken si aucun token dans l\'URL', async () => {
            const res = await GET(makeRequest());
            expect(res.status).toBe(307);
            expect(res.headers.get('location')).toContain('error=InvalidToken');
        });

        it('redirige vers /login?error=InvalidToken si le token est introuvable en base', async () => {
            (prisma.verificationToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            const res = await GET(makeRequest(PLAIN_TOKEN));
            expect(res.status).toBe(307);
            expect(res.headers.get('location')).toContain('error=InvalidToken');
        });

        it('ne marque pas l\'utilisateur comme vérifié pour un token inconnu', async () => {
            (prisma.verificationToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            await GET(makeRequest(PLAIN_TOKEN));
            expect(prisma.user.update).not.toHaveBeenCalled();
        });
    });

    // ── Sécurité : recherche par hash ─────────────────────────────────────────

    describe('sécurité — hash du token', () => {
        it('recherche le token par son hash SHA-256, pas le token brut', async () => {
            (prisma.verificationToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            await GET(makeRequest(PLAIN_TOKEN));
            expect(prisma.verificationToken.findUnique).toHaveBeenCalledWith({
                where: { token: HASHED_TOKEN },
            });
        });

        it('deux tokens différents donnent des hashs différents', () => {
            const tokenA = 'aaaa'.repeat(16);
            const tokenB = 'bbbb'.repeat(16);
            expect(hashToken(tokenA)).not.toBe(hashToken(tokenB));
        });
    });

    // ── Token expiré ──────────────────────────────────────────────────────────

    describe('token expiré', () => {
        beforeEach(() => {
            (prisma.verificationToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                token: HASHED_TOKEN,
                identifier: 'alice@example.com',
                expires: PAST_DATE,
            });
        });

        it('redirige vers /login?error=TokenExpired', async () => {
            const res = await GET(makeRequest(PLAIN_TOKEN));
            expect(res.status).toBe(307);
            expect(res.headers.get('location')).toContain('error=TokenExpired');
        });

        it('supprime le token expiré', async () => {
            await GET(makeRequest(PLAIN_TOKEN));
            expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
                where: { token: HASHED_TOKEN },
            });
        });

        it('ne marque pas l\'utilisateur comme vérifié', async () => {
            await GET(makeRequest(PLAIN_TOKEN));
            expect(prisma.user.update).not.toHaveBeenCalled();
        });
    });

    // ── Token valide ──────────────────────────────────────────────────────────

    describe('token valide', () => {
        beforeEach(() => {
            (prisma.verificationToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                token: HASHED_TOKEN,
                identifier: 'alice@example.com',
                expires: FUTURE_DATE,
            });
        });

        it('marque l\'utilisateur comme vérifié avec la date actuelle', async () => {
            const before = new Date();
            await GET(makeRequest(PLAIN_TOKEN));
            const after = new Date();

            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { email: 'alice@example.com' },
                    data: expect.objectContaining({
                        emailVerified: expect.any(Date),
                    }),
                })
            );

            const updateCall = (prisma.user.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
            const emailVerified: Date = updateCall.data.emailVerified;
            expect(emailVerified.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(emailVerified.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('supprime le token après vérification', async () => {
            await GET(makeRequest(PLAIN_TOKEN));
            expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
                where: { token: HASHED_TOKEN },
            });
        });

        it('effectue la vérification et la suppression dans la même transaction', async () => {
            await GET(makeRequest(PLAIN_TOKEN));
            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
            // Les deux opérations (user.update + token.delete) doivent être dans la transaction
            expect(prisma.user.update).toHaveBeenCalledTimes(1);
            expect(prisma.verificationToken.delete).toHaveBeenCalledTimes(1);
        });

        it('redirige vers /login?verified=true', async () => {
            const res = await GET(makeRequest(PLAIN_TOKEN));
            expect(res.status).toBe(307);
            expect(res.headers.get('location')).toContain('verified=true');
        });
    });
});
