"use client";
import { useState } from "react";
import {
    Button,
    Container,
    Paper,
    Text,
    Title,
    Stack,
    Alert,
    TextInput,
    PasswordInput,
    Anchor,
    PasswordInputProps,
    Progress,
    Box,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
    IconAlertCircle,
    IconCircleCheck,
    IconMail,
    IconLock,
    IconUser,
} from "@tabler/icons-react";

// ── Password strength helper ──────────────────────────────────────────────────

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 20, label: "Très faible", color: "red" };
    if (score === 2) return { score: 40, label: "Faible", color: "orange" };
    if (score === 3) return { score: 60, label: "Moyen", color: "yellow" };
    if (score === 4) return { score: 80, label: "Fort", color: "teal" };
    return { score: 100, label: "Très fort", color: "green" };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const form = useForm({
        initialValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
        validate: {
            name: (v) => (v.trim().length >= 2 ? null : "Nom trop court (2 caractères min.)"),
            email: (v) =>
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.toLowerCase().trim())
                    ? null
                    : "Adresse email invalide",
            password: (v) =>
                v.length >= 8 ? null : "Le mot de passe doit contenir au moins 8 caractères",
            confirmPassword: (v, values) =>
                v === values.password ? null : "Les mots de passe ne correspondent pas",
        },
        validateInputOnBlur: true,
    });

    const strength = form.values.password
        ? getPasswordStrength(form.values.password)
        : null;

    async function handleSubmit(values: typeof form.values) {
        setLoading(true);
        setServerError(null);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: values.name.trim(),
                    email: values.email.toLowerCase().trim(),
                    password: values.password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setServerError(data.error ?? "Une erreur est survenue.");
            } else {
                setSuccess(true);
            }
        } catch {
            setServerError("Une erreur réseau est survenue. Veuillez réessayer.");
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <Container size={420} my={40}>
                <Paper withBorder shadow="md" p={30} radius="md">
                    <Stack align="center" gap="md">
                        <IconCircleCheck size={56} color="var(--mantine-color-green-6)" />
                        <Title order={2} ta="center">
                            Vérifiez votre email !
                        </Title>
                        <Text ta="center" c="dimmed" size="sm">
                            Un lien de confirmation a été envoyé à{" "}
                            <strong>{form.values.email}</strong>.
                            <br />
                            Cliquez sur le lien pour activer votre compte.
                        </Text>
                        <Text ta="center" size="xs" c="dimmed">
                            Le lien expire dans 24 heures. Pensez à vérifier vos spams.
                        </Text>
                        <Anchor href="/login" size="sm">
                            Retour à la connexion
                        </Anchor>
                    </Stack>
                </Paper>
            </Container>
        );
    }

    return (
        <Container size={420} my={40}>
            <Title ta="center" size="h1" fw={900}>
                Créer un compte
            </Title>
            <Text c="dimmed" size="sm" ta="center" mt={5}>
                Déjà inscrit ?{" "}
                <Anchor href="/login" size="sm">
                    Se connecter
                </Anchor>
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="sm">
                        {serverError && (
                            <Alert
                                variant="light"
                                color="red"
                                icon={<IconAlertCircle size={16} />}
                            >
                                {serverError}
                            </Alert>
                        )}

                        <TextInput
                            label="Nom"
                            placeholder="Votre prénom et nom"
                            leftSection={<IconUser size={16} />}
                            {...form.getInputProps("name")}
                        />

                        <TextInput
                            label="Email"
                            placeholder="votre@email.com"
                            leftSection={<IconMail size={16} />}
                            {...form.getInputProps("email")}
                        />

                        <Box>
                            <PasswordInput
                                label="Mot de passe"
                                placeholder="8 caractères minimum"
                                leftSection={<IconLock size={16} />}
                                {...form.getInputProps("password")}
                            />
                            {strength && form.values.password.length > 0 && (
                                <Box mt={6}>
                                    <Progress
                                        value={strength.score}
                                        color={strength.color}
                                        size="xs"
                                        radius="xl"
                                    />
                                    <Text size="xs" c={strength.color} mt={4}>
                                        {strength.label}
                                    </Text>
                                </Box>
                            )}
                        </Box>

                        <PasswordInput
                            label="Confirmer le mot de passe"
                            placeholder="Répétez le mot de passe"
                            leftSection={<IconLock size={16} />}
                            {...form.getInputProps("confirmPassword")}
                        />

                        <Button type="submit" fullWidth loading={loading} mt="xs">
                            Créer mon compte
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
