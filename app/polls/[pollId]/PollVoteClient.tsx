'use client';

import { useState } from 'react';
import {
    Container, Title, Text, Button, Stack, Card, Group, Badge,
    Divider, Alert, Radio, Checkbox, ThemeIcon, Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconInfoCircle, IconClipboardList } from '@tabler/icons-react';
import { PollStatus, PollQuestionType } from '@prisma/client';
import { submitVoteAction, VoteAnswerInput } from './actions';

type PollOption = { id: string; text: string; order: number };
type PollQuestion = { id: string; text: string; type: PollQuestionType; order: number; options: PollOption[] };
type Poll = {
    id: string;
    title: string;
    description: string | null;
    status: PollStatus;
    questions: PollQuestion[];
};

type ExistingSelection = { optionId: string; rank: number | null };
type ExistingAnswer = { questionId: string; selections: ExistingSelection[] };
type ExistingVote = { answers: ExistingAnswer[] } | null;

// ─── RANKED CHOICE ────────────────────────────────────────────────────────────

const RANK_LABELS = ['', '1er', '2ème', '3ème', '4ème', '5ème', '6ème', '7ème', '8ème', '9ème', '10ème'];

function RankedChoiceQuestion({
    question,
    rankings,
    onChange,
}: {
    question: PollQuestion;
    rankings: Record<string, number>; // optionId → rank
    onChange: (rankings: Record<string, number>) => void;
}) {
    const maxRank = question.options.length;

    const handleRankClick = (optionId: string, rank: number) => {
        const updated = { ...rankings };
        // If this option already has this rank, unrank it
        if (updated[optionId] === rank) {
            delete updated[optionId];
        } else {
            // Remove this rank from any other option that has it
            for (const [oid, r] of Object.entries(updated)) {
                if (r === rank && oid !== optionId) delete updated[oid];
            }
            updated[optionId] = rank;
        }
        onChange(updated);
    };

    return (
        <Stack gap="sm">
            <Text size="xs" c="dimmed">
                Cliquez sur un numéro pour classer cette option. Vous n&apos;êtes pas obligé de tout classer.
            </Text>
            {question.options.map(opt => {
                const currentRank = rankings[opt.id];
                return (
                    <Card key={opt.id} withBorder radius="md" p="sm">
                        <Group justify="space-between" wrap="nowrap">
                            <Text size="sm">{opt.text}</Text>
                            <Group gap={4} wrap="nowrap">
                                {Array.from({ length: Math.min(maxRank, 10) }, (_, i) => i + 1).map(rank => {
                                    const isSelected = currentRank === rank;
                                    // Is this rank taken by another option?
                                    const takenByOther = Object.entries(rankings).some(
                                        ([oid, r]) => r === rank && oid !== opt.id
                                    );
                                    return (
                                        <ThemeIcon
                                            key={rank}
                                            size={28}
                                            radius="xl"
                                            variant={isSelected ? 'filled' : 'light'}
                                            color={isSelected ? 'blue' : takenByOther ? 'gray' : 'blue'}
                                            style={{ cursor: 'pointer', opacity: takenByOther && !isSelected ? 0.35 : 1 }}
                                            onClick={() => handleRankClick(opt.id, rank)}
                                        >
                                            <Text size="xs" fw={700}>{rank}</Text>
                                        </ThemeIcon>
                                    );
                                })}
                                {currentRank && (
                                    <Badge variant="filled" color="blue" size="sm" ml={4}>
                                        {RANK_LABELS[currentRank] ?? `#${currentRank}`}
                                    </Badge>
                                )}
                            </Group>
                        </Group>
                    </Card>
                );
            })}
        </Stack>
    );
}

// ─── ALREADY VOTED VIEW ───────────────────────────────────────────────────────

function ExistingVoteView({ poll, existingVote }: { poll: Poll; existingVote: NonNullable<ExistingVote> }) {
    return (
        <Stack>
            <Alert icon={<IconCheck size={16} />} color="green" title="Vote enregistré">
                Merci ! Vos choix ont bien été pris en compte.
            </Alert>
            {poll.questions.map(q => {
                const answer = existingVote.answers.find(a => a.questionId === q.id);
                if (!answer || answer.selections.length === 0) return null;

                const ranked = [...answer.selections]
                    .filter(s => s.rank != null)
                    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
                const unranked = answer.selections.filter(s => s.rank == null);

                return (
                    <Card key={q.id} withBorder radius="md" p="md">
                        <Text fw={600} size="sm" mb="sm">{q.text}</Text>
                        <Stack gap="xs">
                            {ranked.map(sel => {
                                const opt = q.options.find(o => o.id === sel.optionId);
                                return (
                                    <Group key={sel.optionId} gap="sm">
                                        <Badge variant="filled" size="sm">{RANK_LABELS[sel.rank!] ?? `#${sel.rank}`}</Badge>
                                        <Text size="sm">{opt?.text ?? sel.optionId}</Text>
                                    </Group>
                                );
                            })}
                            {unranked.map(sel => {
                                const opt = q.options.find(o => o.id === sel.optionId);
                                return (
                                    <Group key={sel.optionId} gap="sm">
                                        <Badge variant="light" color="gray" size="sm">Sélectionné</Badge>
                                        <Text size="sm">{opt?.text ?? sel.optionId}</Text>
                                    </Group>
                                );
                            })}
                        </Stack>
                    </Card>
                );
            })}
        </Stack>
    );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PollVoteClient({ poll, existingVote }: { poll: Poll; existingVote: ExistingVote }) {
    // State: ranked[questionId][optionId] = rank
    const [rankedChoices, setRankedChoices] = useState<Record<string, Record<string, number>>>({});
    // State: single[questionId] = optionId
    const [singleChoices, setSingleChoices] = useState<Record<string, string>>({});
    // State: multi[questionId] = optionId[]
    const [multiChoices, setMultiChoices] = useState<Record<string, string[]>>({});

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        const answers: VoteAnswerInput[] = [];

        for (const q of poll.questions) {
            if (q.type === 'RANKED_CHOICE') {
                const rankings = rankedChoices[q.id] ?? {};
                const selections = Object.entries(rankings).map(([optionId, rank]) => ({ optionId, rank }));
                if (selections.length > 0) answers.push({ questionId: q.id, selections });
            } else if (q.type === 'SINGLE_CHOICE') {
                const optionId = singleChoices[q.id];
                if (optionId) answers.push({ questionId: q.id, selections: [{ optionId }] });
            } else if (q.type === 'MULTIPLE_CHOICE') {
                const optionIds = multiChoices[q.id] ?? [];
                if (optionIds.length > 0) answers.push({
                    questionId: q.id,
                    selections: optionIds.map(optionId => ({ optionId })),
                });
            }
        }

        if (answers.length === 0) {
            notifications.show({ title: 'Aucune sélection', message: 'Veuillez faire au moins un choix avant de voter.', color: 'orange' });
            return;
        }

        setSubmitting(true);
        try {
            const res = await submitVoteAction(poll.id, answers);
            if (res.success) {
                setSubmitted(true);
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Une erreur est survenue', color: 'red' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container size="sm" py="xl">
            {/* Header */}
            <Stack gap="xs" mb="xl">
                <Group gap="sm">
                    <IconClipboardList size={24} color="var(--mantine-color-blue-6)" />
                    <Title order={2}>{poll.title}</Title>
                </Group>
                {poll.description && <Text c="dimmed">{poll.description}</Text>}
            </Stack>

            {/* Closed poll */}
            {poll.status === 'CLOSED' && (
                <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Sondage clôturé">
                    Ce sondage est clôturé. Les résultats seront communiqués prochainement.
                </Alert>
            )}

            {/* Already voted */}
            {poll.status !== 'CLOSED' && existingVote && !submitted && (
                <ExistingVoteView poll={poll} existingVote={existingVote} />
            )}

            {/* Just submitted */}
            {submitted && (
                <Alert icon={<IconCheck size={16} />} color="green" title="Vote enregistré !">
                    Merci pour votre participation !
                </Alert>
            )}

            {/* Voting form */}
            {poll.status === 'OPEN' && !existingVote && !submitted && (
                <Stack gap="xl">
                    {poll.questions.map((q, qi) => (
                        <Box key={q.id}>
                            {qi > 0 && <Divider mb="xl" />}
                            <Stack gap="md">
                                <Group gap="sm">
                                    <Badge variant="light" size="sm">
                                        {q.type === 'RANKED_CHOICE' ? 'Classement' : q.type === 'SINGLE_CHOICE' ? 'Choix unique' : 'Choix multiple'}
                                    </Badge>
                                    <Text fw={600}>{q.text}</Text>
                                </Group>

                                {q.type === 'RANKED_CHOICE' && (
                                    <RankedChoiceQuestion
                                        question={q}
                                        rankings={rankedChoices[q.id] ?? {}}
                                        onChange={r => setRankedChoices(prev => ({ ...prev, [q.id]: r }))}
                                    />
                                )}

                                {q.type === 'SINGLE_CHOICE' && (
                                    <Radio.Group
                                        value={singleChoices[q.id] ?? ''}
                                        onChange={val => setSingleChoices(prev => ({ ...prev, [q.id]: val }))}
                                    >
                                        <Stack gap="xs">
                                            {q.options.map(opt => (
                                                <Card key={opt.id} withBorder radius="md" p="sm"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setSingleChoices(prev => ({ ...prev, [q.id]: opt.id }))}
                                                >
                                                    <Radio value={opt.id} label={opt.text} />
                                                </Card>
                                            ))}
                                        </Stack>
                                    </Radio.Group>
                                )}

                                {q.type === 'MULTIPLE_CHOICE' && (
                                    <Checkbox.Group
                                        value={multiChoices[q.id] ?? []}
                                        onChange={vals => setMultiChoices(prev => ({ ...prev, [q.id]: vals }))}
                                    >
                                        <Stack gap="xs">
                                            {q.options.map(opt => (
                                                <Card key={opt.id} withBorder radius="md" p="sm"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        const current = multiChoices[q.id] ?? [];
                                                        const next = current.includes(opt.id)
                                                            ? current.filter(id => id !== opt.id)
                                                            : [...current, opt.id];
                                                        setMultiChoices(prev => ({ ...prev, [q.id]: next }));
                                                    }}
                                                >
                                                    <Checkbox value={opt.id} label={opt.text} readOnly />
                                                </Card>
                                            ))}
                                        </Stack>
                                    </Checkbox.Group>
                                )}
                            </Stack>
                        </Box>
                    ))}

                    <Divider />

                    <Group justify="flex-end">
                        <Button
                            size="md"
                            loading={submitting}
                            leftSection={<IconCheck size={16} />}
                            onClick={handleSubmit}
                        >
                            Soumettre mon vote
                        </Button>
                    </Group>
                </Stack>
            )}
        </Container>
    );
}
