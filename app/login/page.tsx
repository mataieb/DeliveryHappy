"use client";
import { useState, useEffect, Suspense } from "react";
import {
    Button,
    Container,
    Paper,
    Text,
    Title,
    Stack,
    Alert,
    Tabs,
    TextInput,
    PasswordInput,
    Anchor,
    Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    IconBrandGoogle,
    IconAlertCircle,
    IconExternalLink,
    IconCircleCheck,
    IconMail,
    IconLock,
} from "@tabler/icons-react";

// ── Error/success messages ────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
    CredentialsSignin: "Email ou mot de passe incorrect.",
    EmailNotVerified: "Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte mail.",
    InvalidToken: "Ce lien de vérification est invalide.",
    TokenExpired: "Ce lien a expiré (24h). Créez un nouveau compte pour recevoir un nouveau lien.",
    OAuthAccountNotLinked: "Un compte existe déjà avec cet email. Connectez-vous avec Google.",
    default: "Une erreur est survenue. Veuillez réessayer.",
};

// ── Inner component (uses useSearchParams) ────────────────────────────────────

function LoginContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isEmbeddedBrowser, setIsEmbeddedBrowser] = useState(false);
    const [loading, setLoading] = useState(false);

    const errorParam = searchParams.get("error");
    const isVerified = searchParams.get("verified") === "true";

    const errorMessage = errorParam
        ? (ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.default)
        : null;

    useEffect(() => {
        const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
        const isInstagram = ua.indexOf("Instagram") > -1;
        const isFacebook = ua.indexOf("FBAN") > -1 || ua.indexOf("FBAV") > -1;
        const isMessenger = ua.indexOf("FBMD") > -1 || ua.indexOf("FBMV") > -1;
        if (isInstagram || isFacebook || isMessenger) setIsEmbeddedBrowser(true);
    }, []);

    const form = useForm({
        initialValues: { email: "", password: "" },
        validate: {
            email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Email invalide"),
            password: (v) => (v.length > 0 ? null : "Mot de passe requis"),
        },
    });

    async function handleCredentialsLogin(values: { email: string; password: string }) {
        setLoading(true);
        const result = await signIn("credentials", {
            email: values.email.toLowerCase().trim(),
            password: values.password,
            callbackUrl: "/menu",
            redirect: false,
        });
        setLoading(false);

        if (result?.error) {
            const msg = ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.default;
            form.setErrors({ password: msg });
        } else if (result?.url) {
            router.push(result.url);
        }
    }

    return (
        <Container size={420} my={40}>
            <Title ta="center" size="h1" fw={900}>
                Bienvenue !
            </Title>
            <Text c="dimmed" size="sm" ta="center" mt={5}>
                Connectez-vous pour commander votre repas
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <Stack gap="md">
                    {/* Embedded browser warning */}
                    {isEmbeddedBrowser && (
                        <Alert
                            variant="light"
                            color="red"
                            title="Navigateur non supporté par Google"
                            icon={<IconAlertCircle size={16} />}
                        >
                            <Text size="sm" mb="xs">
                                Google bloque la connexion depuis les navigateurs intégrés à
                                Instagram/Facebook/Messenger.
                            </Text>
                            <Text size="sm" fw={700}>
                                Ouvrez ce lien dans Safari ou Chrome.
                            </Text>
                        </Alert>
                    )}

                    {/* Email verified success */}
                    {isVerified && (
                        <Alert
                            variant="light"
                            color="green"
                            title="Email confirmé !"
                            icon={<IconCircleCheck size={16} />}
                        >
                            Votre compte est activé. Vous pouvez vous connecter.
                        </Alert>
                    )}

                    {/* URL-level error (e.g. from OAuth redirect) */}
                    {errorMessage && !isVerified && (
                        <Alert
                            variant="light"
                            color="red"
                            title="Erreur"
                            icon={<IconAlertCircle size={16} />}
                        >
                            {errorMessage}
                        </Alert>
                    )}

                    <Tabs defaultValue="credentials">
                        <Tabs.List grow>
                            <Tabs.Tab value="credentials" leftSection={<IconMail size={14} />}>
                                Email
                            </Tabs.Tab>
                            <Tabs.Tab value="google" leftSection={<IconBrandGoogle size={14} />}>
                                Google
                            </Tabs.Tab>
                        </Tabs.List>

                        {/* ── Credentials tab ─────────────────────────────── */}
                        <Tabs.Panel value="credentials" pt="md">
                            <form onSubmit={form.onSubmit(handleCredentialsLogin)}>
                                <Stack gap="sm">
                                    <TextInput
                                        label="Email"
                                        placeholder="votre@email.com"
                                        leftSection={<IconMail size={16} />}
                                        {...form.getInputProps("email")}
                                    />
                                    <PasswordInput
                                        label="Mot de passe"
                                        placeholder="Votre mot de passe"
                                        leftSection={<IconLock size={16} />}
                                        {...form.getInputProps("password")}
                                    />
                                    <Button type="submit" fullWidth loading={loading} mt="xs">
                                        Se connecter
                                    </Button>
                                    <Text ta="center" size="sm" c="dimmed">
                                        Pas encore de compte ?{" "}
                                        <Anchor href="/register" size="sm">
                                            Créer un compte
                                        </Anchor>
                                    </Text>
                                </Stack>
                            </form>
                        </Tabs.Panel>

                        {/* ── Google tab ──────────────────────────────────── */}
                        <Tabs.Panel value="google" pt="md">
                            <Stack gap="sm">
                                <Button
                                    variant="default"
                                    leftSection={<IconBrandGoogle size={16} />}
                                    onClick={() => signIn("google", { callbackUrl: "/menu" })}
                                    fullWidth
                                    disabled={isEmbeddedBrowser}
                                >
                                    Se connecter avec Google
                                </Button>
                                {isEmbeddedBrowser && (
                                    <Text size="xs" c="dimmed" ta="center">
                                        Ouvrez dans votre navigateur système pour utiliser Google.
                                    </Text>
                                )}
                            </Stack>
                        </Tabs.Panel>
                    </Tabs>
                </Stack>
            </Paper>
        </Container>
    );
}

// ── Default export (wraps with Suspense for useSearchParams) ──────────────────

export default function LoginPage() {
    return (
        <Suspense>
            <LoginContent />
        </Suspense>
    );
}
