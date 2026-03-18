import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks (must be declared before imports) ───────────────────────────────────

vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        verificationToken: {
            deleteMany: vi.fn(),
            create: vi.fn(),
        },
    },
}));

vi.mock('@/lib/email', () => ({
    sendVerificationEmail: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password_mock'),
        compare: vi.fn(),
    },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { POST } from '@/app/api/auth/register/route';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
    return new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const VALID_BODY = { name: 'Alice Dupont', email: 'alice@example.com', password: 'monmotdepasse' };

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'user-1', ...VALID_BODY });
        (prisma.verificationToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({});
        (prisma.verificationToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
        (sendVerificationEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    // ── Validation des entrées ────────────────────────────────────────────────

    describe('validation des entrées', () => {
        it('retourne 400 si le nom est manquant', async () => {
            const res = await POST(makeRequest({ email: 'alice@example.com', password: 'motdepasse' }));
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBeTruthy();
        });

        it('retourne 400 si l\'email est manquant', async () => {
            const res = await POST(makeRequest({ name: 'Alice', password: 'motdepasse' }));
            expect(res.status).toBe(400);
        });

        it('retourne 400 si le mot de passe est manquant', async () => {
            const res = await POST(makeRequest({ name: 'Alice', email: 'alice@example.com' }));
            expect(res.status).toBe(400);
        });

        it('retourne 400 pour un email mal formé', async () => {
            const res = await POST(makeRequest({ ...VALID_BODY, email: 'pas-un-email' }));
            expect(res.status).toBe(400);
        });

        it('retourne 400 pour un email sans domaine', async () => {
            const res = await POST(makeRequest({ ...VALID_BODY, email: 'alice@' }));
            expect(res.status).toBe(400);
        });

        it('retourne 400 si le mot de passe fait moins de 8 caractères', async () => {
            const res = await POST(makeRequest({ ...VALID_BODY, password: '1234567' }));
            expect(res.status).toBe(400);
        });

        it('accepte un mot de passe de 8 caractères exactement', async () => {
            const res = await POST(makeRequest({ ...VALID_BODY, password: '12345678' }));
            expect(res.status).toBe(200);
        });
    });

    // ── Gestion des conflits ──────────────────────────────────────────────────

    describe('conflits avec un compte existant', () => {
        it('retourne 409 si l\'email est déjà lié à un compte Google', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'alice@example.com',
                password: null,
                accounts: [{ provider: 'google' }],
            });

            const res = await POST(makeRequest(VALID_BODY));
            expect(res.status).toBe(409);
            const body = await res.json();
            expect(body.error).toContain('Google');
        });

        it('retourne 409 si un compte credentials existe déjà', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'alice@example.com',
                password: '$2a$12$somehash',
                accounts: [],
            });

            const res = await POST(makeRequest(VALID_BODY));
            expect(res.status).toBe(409);
        });

        it('ne crée pas de compte en cas de conflit', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'alice@example.com',
                password: '$2a$12$somehash',
                accounts: [],
            });

            await POST(makeRequest(VALID_BODY));
            expect(prisma.user.create).not.toHaveBeenCalled();
        });
    });

    // ── Sécurité des mots de passe ────────────────────────────────────────────

    describe('sécurité — hachage du mot de passe', () => {
        it('utilise bcrypt avec 12 rounds', async () => {
            await POST(makeRequest(VALID_BODY));
            expect(bcrypt.hash).toHaveBeenCalledWith('monmotdepasse', 12);
        });

        it('ne stocke pas le mot de passe en clair', async () => {
            await POST(makeRequest(VALID_BODY));
            const createCall = (prisma.user.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(createCall.data.password).not.toBe('monmotdepasse');
            expect(createCall.data.password).toBe('hashed_password_mock');
        });

        it('normalise l\'email en minuscules avant stockage', async () => {
            await POST(makeRequest({ ...VALID_BODY, email: 'ALICE@EXAMPLE.COM' }));
            const createCall = (prisma.user.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(createCall.data.email).toBe('alice@example.com');
        });
    });

    // ── Sécurité du token de vérification ────────────────────────────────────

    describe('sécurité — token de vérification email', () => {
        it('stocke le hash SHA-256 du token, pas le token brut', async () => {
            await POST(makeRequest(VALID_BODY));

            const tokenCreateCall = (prisma.verificationToken.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
            const storedToken: string = tokenCreateCall.data.token;
            const sentToken: string = (sendVerificationEmail as ReturnType<typeof vi.fn>).mock.calls[0][2];

            // Le hash stocké en base doit être différent du token envoyé par email
            expect(storedToken).not.toBe(sentToken);
        });

        it('le token stocké est un hash SHA-256 (64 caractères hex)', async () => {
            await POST(makeRequest(VALID_BODY));
            const tokenCreateCall = (prisma.verificationToken.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(tokenCreateCall.data.token).toMatch(/^[a-f0-9]{64}$/);
        });

        it('le token envoyé par email est un hex de 64 caractères (32 bytes)', async () => {
            await POST(makeRequest(VALID_BODY));
            const sentToken: string = (sendVerificationEmail as ReturnType<typeof vi.fn>).mock.calls[0][2];
            expect(sentToken).toMatch(/^[a-f0-9]{64}$/);
        });

        it('définit une expiration à 24 heures', async () => {
            const before = Date.now();
            await POST(makeRequest(VALID_BODY));
            const after = Date.now();

            const tokenCreateCall = (prisma.verificationToken.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
            const expires: Date = tokenCreateCall.data.expires;
            const expectedMs = 24 * 60 * 60 * 1000;

            expect(expires.getTime()).toBeGreaterThanOrEqual(before + expectedMs - 200);
            expect(expires.getTime()).toBeLessThanOrEqual(after + expectedMs + 200);
        });

        it('supprime les anciens tokens de l\'email avant d\'en créer un nouveau', async () => {
            await POST(makeRequest(VALID_BODY));
            expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
                where: { identifier: 'alice@example.com' },
            });
        });

        it('envoie l\'email à la bonne adresse avec le bon nom', async () => {
            await POST(makeRequest(VALID_BODY));
            expect(sendVerificationEmail).toHaveBeenCalledWith(
                'alice@example.com',
                'Alice Dupont',
                expect.any(String)
            );
        });
    });

    // ── Réponse succès ────────────────────────────────────────────────────────

    describe('réponse en cas de succès', () => {
        it('retourne { success: true } avec status 200', async () => {
            const res = await POST(makeRequest(VALID_BODY));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
        });
    });
});
