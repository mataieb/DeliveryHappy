'use client';

import { useState, useEffect } from 'react';
import {
    Container, Title, Button, Group, Stack, Card, Badge, Text,
    ActionIcon, Divider, Progress, Table, NumberInput, Tooltip,
    CopyButton, Anchor, ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconArrowLeft, IconLock, IconLockOpen, IconCopy, IconCheck,
    IconUsers, IconChartBar, IconPencil,
} from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { PollStatus, PollQuestionType } from '@prisma/client';
import { updatePollStatusAction, updateVoteWeightAction } from '../actions';

type PollOption = { id: string; text: string; order: number };
type PollQuestion = { id: string; text: string; type: PollQuestionType; order: number; options: PollOption[] };

type Selection = { id: string; optionId: string; rank: number | null; option: PollOption };
type Answer = { id: string; questionId: string; selections: Selection[] };
type Voter = { id: string; name: string | null; email: string };
type Vote = { id: string; userId: string; weight: number; submittedAt: Date; user: Voter; answers: Answer[] };

type Poll = {
    id: string;
    title: string;
    description: string | null;
    status: PollStatus;
    openAt: Date | null;
    closeAt: Date | null;
    createdAt: Date;
    questions: PollQuestion[];
    votes: Vote[];
};

const STATUS_LABELS: Record<PollStatus, string> = { DRAFT: 'Brouillon', OPEN: 'Ouvert', CLOSED: 'Clôturé' };
const STATUS_COLORS: Record<PollStatus, string> = { DRAFT: 'gray', OPEN: 'green', CLOSED: 'blue' };

// Score = sum(weight / rank) for ranked, sum(weight) for others
function computeOptionScores(question: PollQuestion, votes: Vote[]): Map<string, number> {
    const scores = new Map<string, number>();
    for (const opt of question.options) scores.set(opt.id, 0);

    for (const vote of votes) {
        const answer = vote.answers.find(a => a.questionId === question.id);
        if (!answer) continue;
        for (const sel of answer.selections) {
            const prev = scores.get(sel.optionId) ?? 0;
            const delta = sel.rank != null ? vote.weight / sel.rank : vote.weight;
            scores.set(sel.optionId, prev + delta);
        }
    }
    return scores;
}

// For RANKED_CHOICE: show how many voters gave each rank
function computeRankDistribution(optionId: string, question: PollQuestion, votes: Vote[]): Map<number, number> {
    const dist = new Map<number, number>();
    for (const vote of votes) {
        const answer = vote.answers.find(a => a.questionId === question.id);
        if (!answer) continue;
        const sel = answer.selections.find(s => s.optionId === optionId);
        if (sel?.rank != null) {
            dist.set(sel.rank, (dist.get(sel.rank) ?? 0) + 1);
        }
    }
    return dist;
}

function QuestionResults({ question, votes }: { question: PollQuestion; votes: Vote[] }) {
    const scores = computeOptionScores(question, votes);
    const maxScore = Math.max(...Array.from(scores.values()), 0.001);

    const sorted = [...question.options].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));

    return (
        <Stack gap="sm">
            {sorted.map((opt, idx) => {
                const score = scores.get(opt.id) ?? 0;
                const pct = (score / maxScore) * 100;
                const rankDist = question.type === 'RANKED_CHOICE'
                    ? computeRankDistribution(opt.id, question, votes)
                    : null;

                return (
                    <div key={opt.id}>
                        <Group justify="space-between" mb={4}>
                            <Group gap="xs">
                                {idx === 0 && score > 0 && (
                                    <ThemeIcon size="xs" color="yellow" variant="light" radius="xl">
                                        <span style={{ fontSize: 10 }}>1</span>
                                    </ThemeIcon>
                                )}
                                <Text size="sm" fw={idx === 0 && score > 0 ? 600 : 400}>{opt.text}</Text>
                            </Group>
                            <Group gap="xs">
                                {rankDist && rankDist.size > 0 && (
                                    <Group gap={4}>
                                        {Array.from(rankDist.entries())
                                            .sort(([a], [b]) => a - b)
                                            .map(([rank, count]) => (
                                                <Badge key={rank} size="xs" variant="outline" color="blue">
                                                    #{rank}: {count}
                                                </Badge>
                                            ))}
                                    </Group>
                                )}
                                <Text size="xs" c="dimmed" fw={500}>
                                    {score.toFixed(2)} pts
                                </Text>
                            </Group>
                        </Group>
                        <Progress value={pct} size="sm" color={idx === 0 ? 'blue' : 'gray'} radius="xl" />
                    </div>
                );
            })}
        </Stack>
    );
}

function VoterRow({ vote, onWeightSave }: { vote: Vote; onWeightSave: (voteId: string, w: number) => Promise<void> }) {
    const [editMode, setEditMode] = useState(false);
    const [weight, setWeight] = useState<number>(vote.weight);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        await onWeightSave(vote.id, weight);
        setSaving(false);
        setEditMode(false);
    };

    return (
        <Table.Tr>
            <Table.Td>
                <Stack gap={0}>
                    <Text size="sm">{vote.user.name || '—'}</Text>
                    <Text size="xs" c="dimmed">{vote.user.email}</Text>
                </Stack>
            </Table.Td>
            <Table.Td>
                <Text size="xs" c="dimmed">{dayjs(vote.submittedAt).format('DD/MM/YYYY HH:mm')}</Text>
            </Table.Td>
            <Table.Td>
                {editMode ? (
                    <Group gap="xs">
                        <NumberInput
                            value={weight}
                            onChange={v => setWeight(Number(v) || 1)}
                            min={0.1}
                            max={10}
                            step={0.5}
                            decimalScale={1}
                            size="xs"
                            style={{ width: 80 }}
                        />
                        <Button size="xs" loading={saving} onClick={save}>OK</Button>
                        <Button size="xs" variant="subtle" onClick={() => { setWeight(vote.weight); setEditMode(false); }}>✕</Button>
                    </Group>
                ) : (
                    <Group gap="xs">
                        <Badge variant={vote.weight !== 1 ? 'filled' : 'light'} color={vote.weight !== 1 ? 'orange' : 'gray'} size="sm">
                            ×{vote.weight.toFixed(1)}
                        </Badge>
                        <Tooltip label="Modifier le poids">
                            <ActionIcon size="xs" variant="subtle" onClick={() => setEditMode(true)}>
                                <IconPencil size="0.75rem" />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                )}
            </Table.Td>
        </Table.Tr>
    );
}

export default function PollDetailClient({ poll }: { poll: Poll }) {
    const [pollUrl, setPollUrl] = useState(`/polls/${poll.id}`);
    useEffect(() => {
        setPollUrl(`${window.location.origin}/polls/${poll.id}`);
    }, [poll.id]);

    const handleStatusChange = async (status: PollStatus) => {
        const res = await updatePollStatusAction(poll.id, status);
        if (!res.success) notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
    };

    const handleWeightSave = async (voteId: string, weight: number) => {
        const res = await updateVoteWeightAction(voteId, weight);
        if (!res.success) notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
    };

    return (
        <Container fluid>
            <Group mb="lg">
                <Button
                    component={Link}
                    href="/admin/polls"
                    variant="subtle"
                    leftSection={<IconArrowLeft size={14} />}
                    size="sm"
                >
                    Sondages
                </Button>
            </Group>

            {/* Header */}
            <Group justify="space-between" mb="xl" wrap="wrap">
                <Stack gap={4}>
                    <Group gap="sm">
                        <Title order={2}>{poll.title}</Title>
                        <Badge color={STATUS_COLORS[poll.status]} size="lg">
                            {STATUS_LABELS[poll.status]}
                        </Badge>
                    </Group>
                    {poll.description && <Text c="dimmed">{poll.description}</Text>}
                    <Text size="xs" c="dimmed">
                        {poll.votes.length} vote{poll.votes.length > 1 ? 's' : ''}
                        {poll.openAt && <> · Ouverture : {dayjs(poll.openAt).format('DD/MM/YYYY HH:mm')}</>}
                        {poll.closeAt && <> · Fermeture : {dayjs(poll.closeAt).format('DD/MM/YYYY HH:mm')}</>}
                    </Text>
                </Stack>

                <Group gap="xs">
                    {/* Share link */}
                    <CopyButton value={pollUrl}>
                        {({ copied, copy }) => (
                            <Button
                                size="sm"
                                variant="light"
                                leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                color={copied ? 'green' : 'blue'}
                                onClick={copy}
                            >
                                {copied ? 'Lien copié !' : 'Copier le lien'}
                            </Button>
                        )}
                    </CopyButton>

                    {poll.status !== 'OPEN' && (
                        <Button
                            size="sm"
                            color="green"
                            variant="light"
                            leftSection={<IconLockOpen size={14} />}
                            onClick={() => handleStatusChange('OPEN')}
                        >
                            Ouvrir
                        </Button>
                    )}
                    {poll.status === 'OPEN' && (
                        <Button
                            size="sm"
                            color="blue"
                            variant="light"
                            leftSection={<IconLock size={14} />}
                            onClick={() => handleStatusChange('CLOSED')}
                        >
                            Clôturer
                        </Button>
                    )}
                </Group>
            </Group>

            <Group align="flex-start" wrap="wrap" gap="xl">
                {/* Results */}
                <Stack style={{ flex: 2, minWidth: 300 }}>
                    <Group gap="xs">
                        <IconChartBar size={18} />
                        <Title order={4}>Résultats</Title>
                    </Group>

                    {poll.votes.length === 0 ? (
                        <Text c="dimmed" size="sm">Aucun vote pour le moment.</Text>
                    ) : (
                        poll.questions.map(q => (
                            <Card key={q.id} withBorder radius="md" p="md">
                                <Stack gap="md">
                                    <Group gap="xs">
                                        <Badge variant="light" size="sm">
                                            {q.type === 'RANKED_CHOICE' ? 'Classement' : q.type === 'SINGLE_CHOICE' ? 'Choix unique' : 'Choix multiple'}
                                        </Badge>
                                        <Text fw={600} size="sm">{q.text}</Text>
                                    </Group>
                                    <Divider />
                                    <QuestionResults question={q} votes={poll.votes} />
                                    {q.type === 'RANKED_CHOICE' && (
                                        <Text size="xs" c="dimmed">
                                            Score = Σ (poids du votant / rang). Les badges #N indiquent le nombre de fois où l&apos;option a été classée en position N.
                                        </Text>
                                    )}
                                </Stack>
                            </Card>
                        ))
                    )}
                </Stack>

                {/* Voters */}
                <Stack style={{ flex: 1, minWidth: 280 }}>
                    <Group gap="xs">
                        <IconUsers size={18} />
                        <Title order={4}>Votants ({poll.votes.length})</Title>
                    </Group>

                    {poll.votes.length === 0 ? (
                        <Text c="dimmed" size="sm">Aucun vote.</Text>
                    ) : (
                        <Card withBorder radius="md" p={0}>
                            <Table striped highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Utilisateur</Table.Th>
                                        <Table.Th>Date</Table.Th>
                                        <Table.Th>Poids</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {poll.votes.map(vote => (
                                        <VoterRow key={vote.id} vote={vote} onWeightSave={handleWeightSave} />
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Card>
                    )}
                </Stack>
            </Group>
        </Container>
    );
}
