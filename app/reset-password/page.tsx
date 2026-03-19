"use client";
import { useState, Suspense } from "react";
import {
    Button, Container, Paper, Text, Title, Stack, PasswordInput, Alert, Anchor,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useSearchParams, useRouter } from "next/navigation";
import { IconLock, IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token") ?? "";
    const email = searchParams.get("email") ?? "";

    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm({
        initialValues: { password: "", confirm: "" },
        validate: {
            password: (v) => (v.length >= 8 ? null : "Au moins 8 caractères"),
            confirm: (v, values) => (v === values.password ? null : "Les mots de passe ne correspondent pas"),
        },
    });

    if (!token || !email) {
        return (
            <Container size={420} my={40}>
                <Paper withBorder shadow="md" p={30} radius="md">
                    <Alert variant="light" color="red" title="Lien invalide" icon={<IconAlertCircle size={16} />}>
                        Ce lien de réinitialisation est invalide ou incomplet.
                    </Alert>
                    <Text ta="center" size="sm" mt="md">
                        <Anchor href="/forgot-password">Faire une nouvelle demande</Anchor>
                    </Text>
                </Paper>
            </Container>
        );
    }

    async function handleSubmit(values: { password: string; confirm: string }) {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, token, password: values.password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Une erreur est survenue.");
            } else {
                setDone(true);
                setTimeout(() => router.push("/login"), 3000);
            }
        } catch {
            setError("Une erreur est survenue. Veuillez réessayer.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Container size={420} my={40}>
            <Title ta="center" size="h1" fw={900}>Nouveau mot de passe</Title>
            <Text c="dimmed" size="sm" ta="center" mt={5}>
                Choisissez un nouveau mot de passe pour votre compte
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                {done ? (
                    <Alert
                        variant="light"
                        color="green"
                        title="Mot de passe mis à jour !"
                        icon={<IconCircleCheck size={16} />}
                    >
                        Votre mot de passe a été modifié. Redirection vers la connexion...
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
                            <PasswordInput
                                label="Nouveau mot de passe"
                                placeholder="Au moins 8 caractères"
                                leftSection={<IconLock size={16} />}
                                {...form.getInputProps("password")}
                            />
                            <PasswordInput
                                label="Confirmer le mot de passe"
                                placeholder="Répétez le mot de passe"
                                leftSection={<IconLock size={16} />}
                                {...form.getInputProps("confirm")}
                            />
                            <Button type="submit" fullWidth loading={loading} mt="xs">
                                Enregistrer le nouveau mot de passe
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

export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordContent />
        </Suspense>
    );
}
