"use client";
import { useState, useEffect } from "react";
import {
    Button,
    Container,
    Paper,
    Text,
    Title,
    Stack,
    Alert,
} from "@mantine/core";
import { signIn } from "next-auth/react";
import { IconBrandGoogle, IconAlertCircle, IconExternalLink } from "@tabler/icons-react";

export default function LoginPage() {
    const [isEmbeddedBrowser, setIsEmbeddedBrowser] = useState(false);

    useEffect(() => {
        const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
        // Basic detection for common in-app browsers that might block Google Auth
        const isInstagram = ua.indexOf('Instagram') > -1;
        const isFacebook = ua.indexOf('FBAN') > -1 || ua.indexOf('FBAV') > -1;
        const isMessenger = ua.indexOf('FBMD') > -1 || ua.indexOf('FBMV') > -1;

        if (isInstagram || isFacebook || isMessenger) {
            setIsEmbeddedBrowser(true);
        }
    }, []);

    return (
        <Container size={420} my={40}>
            <Title ta="center" size="h1" fw={900}>
                Bienvenue !
            </Title>
            <Text c="dimmed" size="sm" ta="center" mt={5}>
                Connectez-vous pour commander votre repas
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <Stack>
                    {isEmbeddedBrowser && (
                        <Alert
                            variant="light"
                            color="red"
                            title="Navigateur non supporté par Google"
                            icon={<IconAlertCircle size={16} />}
                        >
                            <Text size="sm" mb="xs">
                                Google bloque la connexion depuis les navigateurs intégrés à Instagram/Facebook/Messenger pour des raisons de sécurité.
                            </Text>
                            <Text size="sm" fw={700}>
                                Veuillez ouvrir ce lien dans votre navigateur système (Safari ou Chrome).
                            </Text>
                            <Text size="xs" c="dimmed" mt="xs">
                                Appuyez sur les 3 points en haut/bas de l'écran &gt; Ouvrir dans le navigateur.
                            </Text>
                        </Alert>
                    )}

                    <Button
                        variant="default"
                        leftSection={<IconBrandGoogle size={16} />}
                        onClick={() => signIn("google", { callbackUrl: "/menu" })}
                        fullWidth
                        disabled={isEmbeddedBrowser}
                    >
                        Se connecter avec Google
                    </Button>
                </Stack>
            </Paper>
        </Container>
    );
}
