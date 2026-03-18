import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { authorizeCredentials } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// ── Données de test ───────────────────────────────────────────────────────────

const VERIFIED_USER = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    password: '$2a$12$hashedpassword',
    emailVerified: new Date('2025-01-01'),
    role: 'USER',
};

const UNVERIFIED_USER = { ...VERIFIED_USER, emailVerified: null };

// ─────────────────────────────────────────────────────────────────────────────

describe('authorizeCredentials', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Entrées invalides ─────────────────────────────────────────────────────

    describe('entrées invalides', () => {
        it('retourne null si les credentials sont undefined', async () => {
            const result = await authorizeCredentials(undefined);
            expect(result).toBeNull();
        });

        it('retourne null si l\'email est vide', async () => {
            const result = await authorizeCredentials({ email: '', password: 'password' });
            expect(result).toBeNull();
        });

        it('retourne null si le mot de passe est vide', async () => {
            const result = await authorizeCredentials({ email: 'alice@example.com', password: '' });
            expect(result).toBeNull();
        });

        it('n\'interroge pas la base de données pour des entrées invalides', async () => {
            await authorizeCredentials({ email: '', password: '' });
            expect(prisma.user.findUnique).not.toHaveBeenCalled();
        });
    });

    // ── Utilisateur introuvable ───────────────────────────────────────────────

    describe('utilisateur introuvable', () => {
        it('retourne null si aucun utilisateur ne correspond à l\'email', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            const result = await authorizeCredentials({ email: 'inconnu@example.com', password: 'password' });
            expect(result).toBeNull();
        });

        it('ne révèle pas si l\'email existe — utilisateur inconnu et mauvais mot de passe retournent tous les deux null', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            const resultUnknown = await authorizeCredentials({ email: 'inconnu@example.com', password: 'password' });

            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(VERIFIED_USER);
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
            const resultWrongPwd = await authorizeCredentials({ email: 'alice@example.com', password: 'mauvais' });

            expect(resultUnknown).toBeNull();
            expect(resultWrongPwd).toBeNull();
        });
    });

    // ── Compte Google (pas de mot de passe) ───────────────────────────────────

    describe('compte Google sans mot de passe', () => {
        it('retourne null si le compte n\'a pas de mot de passe', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...VERIFIED_USER,
                password: null,
            });
            const result = await authorizeCredentials({ email: 'alice@example.com', password: 'nimportequoi' });
            expect(result).toBeNull();
        });

        it('ne tente pas de comparer le hash pour un compte sans mot de passe', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...VERIFIED_USER,
                password: null,
            });
            await authorizeCredentials({ email: 'alice@example.com', password: 'password' });
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });
    });

    // ── Mauvais mot de passe ──────────────────────────────────────────────────

    describe('mauvais mot de passe', () => {
        it('retourne null si le mot de passe ne correspond pas', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(VERIFIED_USER);
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
            const result = await authorizeCredentials({ email: 'alice@example.com', password: 'mauvaismdp' });
            expect(result).toBeNull();
        });

        it('compare contre le hash stocké en base, pas le mot de passe brut', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(VERIFIED_USER);
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
            await authorizeCredentials({ email: 'alice@example.com', password: 'tentative' });
            expect(bcrypt.compare).toHaveBeenCalledWith('tentative', VERIFIED_USER.password);
        });
    });

    // ── Email non vérifié ─────────────────────────────────────────────────────

    describe('email non vérifié', () => {
        it('lève une erreur "EmailNotVerified" si l\'email n\'est pas confirmé', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(UNVERIFIED_USER);
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            await expect(
                authorizeCredentials({ email: 'alice@example.com', password: 'bonmotdepasse' })
            ).rejects.toThrow('EmailNotVerified');
        });

        it('bloque même si le mot de passe est correct', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(UNVERIFIED_USER);
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            await expect(
                authorizeCredentials({ email: 'alice@example.com', password: 'bonmotdepasse' })
            ).rejects.toThrow();
        });
    });

    // ── Connexion réussie ─────────────────────────────────────────────────────

    describe('connexion réussie', () => {
        it('retourne l\'utilisateur si email + mot de passe sont corrects', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(VERIFIED_USER);
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            const result = await authorizeCredentials({ email: 'alice@example.com', password: 'bonmotdepasse' });
            expect(result).not.toBeNull();
            expect(result!.id).toBe('user-1');
            expect(result!.email).toBe('alice@example.com');
        });

        it('normalise l\'email en minuscules avant la recherche en base', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(VERIFIED_USER);
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            await authorizeCredentials({ email: 'ALICE@EXAMPLE.COM', password: 'bonmotdepasse' });
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'alice@example.com' },
            });
        });
    });
});
