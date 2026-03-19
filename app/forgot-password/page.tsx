"use client";
import { useState, Suspense } from "react";
import {
    Button, Container, Paper, Text, Title, Stack, TextInput, Alert, Anchor,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconMail, IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";

function ForgotPasswordContent() {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm({
        initialValues: { email: "" },
        validate: {
            email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Email invalide"),
        },
    });

    async function handleSubmit(values: { email: string }) {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: values.email }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Une erreur est survenue.");
            } else {
                setSent(true);
            }
        } catch {
            setError("Une erreur est survenue. Veuillez réessayer.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Container size={420} my={40}>
            <Title ta="center" size="h1" fw={900}>Mot de passe oublié</Title>
            <Text c="dimmed" size="sm" ta="center" mt={5}>
                Entrez votre email pour recevoir un lien de réinitialisation
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                {sent ? (
                    <Alert
                        variant="light"
                        color="green"
                        title="Email envoyé !"
                        icon={<IconCircleCheck size={16} />}
                    >
                        Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques instants.
                        Le lien expire dans 1 heure.
                    </Alert>
                ) : (
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="sm">
                            {error && (
                                <Alert
                                    variant="light"
                                    color="red"
                                    title="Erreur"
                                    icon={<IconAlertCircle size={16} />}
                                >
                                    {error}
                                </Alert>
                            )}
                            <TextInput
                                label="Email"
                                placeholder="votre@email.com"
                                leftSection={<IconMail size={16} />}
                                {...form.getInputProps("email")}
                            />
                            <Button type="submit" fullWidth loading={loading} mt="xs">
                                Envoyer le lien
                            </Button>
                        </Stack>
                    </form>
                )}

                <Text ta="center" size="sm" c="dimmed" mt="md">
                    <Anchor href="/login" size="sm">Retour à la connexion</Anchor>
                </Text>
            </Paper>
        </Container>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense>
            <ForgotPasswordContent />
        </Suspense>
    );
}
