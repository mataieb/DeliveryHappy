"use client";

import {
    Button,
    Container,
    Paper,
    Text,
    Title,
    Center,
    Stack,
} from "@mantine/core";
import { signIn } from "next-auth/react";
import { IconBrandGoogle } from "@tabler/icons-react";

export default function LoginPage() {
    return (
        <Container size={420} my={40}>
            <Title ta="center" size="h1" fw={900}>
                Welcome back!
            </Title>
            <Text c="dimmed" size="sm" ta="center" mt={5}>
                Please sign in to order your lunch
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <Stack>
                    <Button
                        variant="default"
                        leftSection={<IconBrandGoogle size={16} />}
                        onClick={() => signIn("google", { callbackUrl: "/menu" })}
                        fullWidth
                    >
                        Sign in with Google
                    </Button>
                </Stack>
            </Paper>
        </Container>
    );
}
