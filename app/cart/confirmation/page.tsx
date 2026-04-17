import { Container, Title, Text, Button, Stack, ThemeIcon, Group } from '@mantine/core';
import { IconCheck, IconShoppingBag, IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import InlinePollVote from './InlinePollVote';
import { syncPollStatusesAction } from '@/app/admin/polls/actions';

export const dynamic = 'force-dynamic';

export default async function OrderConfirmationPage() {
    const session = await getServerSession(authOptions);

    // Sondages ouverts que l'user n'a pas encore votés
    // Enveloppé dans un try/catch au cas où les tables n'existent pas encore en base
    let unvotedPolls: any[] = [];
    try {
        await syncPollStatusesAction();

        const openPolls = await prisma.poll.findMany({
            where: { status: 'OPEN' },
            orderBy: { createdAt: 'desc' },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                    include: { options: { orderBy: { order: 'asc' } } },
                },
            },
        });

        if (session?.user?.id && openPolls.length > 0) {
            const results = await Promise.all(
                openPolls.map(async poll => {
                    const voted = await prisma.pollVote.findUnique({
                        where: { pollId_userId: { pollId: poll.id, userId: session.user.id } },
                        select: { id: true },
                    });
                    return voted ? null : poll;
                })
            );
            unvotedPolls = results.filter(Boolean);
        }
    } catch {
        // Tables pas encore créées en DB ou autre erreur — on affiche la page sans sondage
    }

    return (
        <Container size="sm" pt="xs" pb="xl">
            <Stack align="center" gap="xl" py="xl">
                <ThemeIcon size={100} radius={100} variant="light" color="green">
                    <IconCheck size={55} />
                </ThemeIcon>

                <Stack align="center" gap="xs">
                    <Title order={2} ta="center">Commande validée !</Title>
                    <Text c="dimmed" ta="center" maw={400}>
                        Votre commande a bien été enregistrée. Vous serez livré entre 11h et 13h.
                        Vous pouvez suivre son statut dans vos commandes.
                    </Text>
                </Stack>

                <InlinePollVote polls={unvotedPolls} />

                <Group wrap="nowrap">
                    <Link href="/menu" style={{ textDecoration: 'none' }}>
                        <Button variant="light" leftSection={<IconArrowLeft size={16} />}>
                            Retour au menu
                        </Button>
                    </Link>
                    <Link href="/orders" style={{ textDecoration: 'none' }}>
                        <Button leftSection={<IconShoppingBag size={16} />}>
                            Mes commandes
                        </Button>
                    </Link>
                </Group>
            </Stack>
        </Container>
    );
}
