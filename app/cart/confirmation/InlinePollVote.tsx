'use client';

import { useState } from 'react';
import {
    Stack, Card, Text, Badge, Button, Group, ThemeIcon, Divider, Radio, Checkbox, Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconClipboardList } from '@tabler/icons-react';
import { PollQuestionType } from '@prisma/client';
import { submitVoteAction, VoteAnswerInput } from '@/app/polls/[pollId]/actions';

type PollOption = { id: string; text: string; order: number };
type PollQuestion = { id: string; text: string; type: PollQuestionType; order: number; options: PollOption[] };
type Poll = { id: string; title: string; description: string | null; questions: PollQuestion[] };

const RANK_LABELS = ['', '1er', '2ème', '3ème', '4ème', '5ème', '6ème', '7ème', '8ème'];

function RankedOptions({
    question,
    rankings,
    onChange,
}: {
    question: PollQuestion;
    rankings: Record<string, number>;
    onChange: (r: Record<string, number>) => void;
}) {
    const handleClick = (optionId: string, rank: number) => {
        const updated = { ...rankings };
        if (updated[optionId] === rank) {
            delete updated[optionId];
        } else {
            for (const [oid, r] of Object.entries(updated)) {
                if (r === rank && oid !== optionId) delete updated[oid];
            }
            updated[optionId] = rank;
        }
        onChange(updated);
    };

    return (
        <Stack gap="xs">
            <Text size="xs" c="dimmed">Cliquez sur un numéro pour classer (partiel autorisé)</Text>
            {question.options.map(opt => {
                const currentRank = rankings[opt.id];
                return (
                    <Card key={opt.id} withBorder radius="md" p="xs">
                        <Group justify="space-between" wrap="nowrap">
                            <Text size="sm">{opt.text}</Text>
                            <Group gap={4} wrap="nowrap">
                                {Array.from({ length: Math.min(question.options.length, 8) }, (_, i) => i + 1).map(rank => {
                                    const isSelected = currentRank === rank;
                                    const takenByOther = Object.entries(rankings).some(
                                        ([oid, r]) => r === rank && oid !== opt.id
                                    );
                                    return (
                                        <ThemeIcon
                                            key={rank}
                                            size={26}
                                            radius="xl"
                                            variant={isSelected ? 'filled' : 'light'}
                                            color={isSelected ? 'blue' : 'blue'}
                                            style={{ cursor: 'pointer', opacity: takenByOther && !isSelected ? 0.3 : 1 }}
                                            onClick={() => handleClick(opt.id, rank)}
                                        >
                                            <Text size="xs" fw={700}>{rank}</Text>
                                        </ThemeIcon>
                                    );
                                })}
                                {currentRank && (
                                    <Badge size="xs" variant="filled" color="blue" ml={2}>
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

function SinglePoll({ poll }: { poll: Poll }) {
    const [ranked, setRanked] = useState<Record<string, Record<string, number>>>({});
    const [single, setSingle] = useState<Record<string, string>>({});
    const [multi, setMulti] = useState<Record<string, string[]>>({});
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        const answers: VoteAnswerInput[] = [];
        for (const q of poll.questions) {
            if (q.type === 'RANKED_CHOICE') {
                const r = ranked[q.id] ?? {};
                const sels = Object.entries(r).map(([optionId, rank]) => ({ optionId, rank }));
                if (sels.length > 0) answers.push({ questionId: q.id, selections: sels });
            } else if (q.type === 'SINGLE_CHOICE') {
                const opt = single[q.id];
                if (opt) answers.push({ questionId: q.id, selections: [{ optionId: opt }] });
            } else {
                const opts = multi[q.id] ?? [];
                if (opts.length > 0) answers.push({ questionId: q.id, selections: opts.map(o => ({ optionId: o })) });
            }
        }
        if (answers.length === 0) {
            notifications.show({ message: 'Faites au moins un choix', color: 'orange' });
            return;
        }
        setLoading(true);
        const res = await submitVoteAction(poll.id, answers);
        setLoading(false);
        if (res.success) {
            setSubmitted(true);
        } else {
            notifications.show({ message: res.error, color: 'red' });
        }
    };

    if (submitted) {
        return (
            <Card withBorder radius="md" p="md" bg="green.0">
                <Stack align="center" gap="sm" py="sm">
                    <ThemeIcon color="green" variant="light" radius="xl" size={52}>
                        <IconCheck size={28} />
                    </ThemeIcon>
                    <Text fw={700} ta="center">Merci pour votre vote !</Text>
                </Stack>
            </Card>
        );
    }

    return (
        <Card withBorder radius="md" p="md">
            <Stack gap="md">
                <Group gap="xs">
                    <IconClipboardList size={18} color="var(--mantine-color-blue-6)" />
                    <Text fw={600}>{poll.title}</Text>
                </Group>
                {poll.description && <Text size="sm" c="dimmed">{poll.description}</Text>}

                {poll.questions.map((q, qi) => (
                    <Box key={q.id}>
                        {qi > 0 && <Divider mb="md" />}
                        <Stack gap="sm">
                            <Group gap="xs">
                                <Badge size="xs" variant="light">
                                    {q.type === 'RANKED_CHOICE' ? 'Classement' : q.type === 'SINGLE_CHOICE' ? 'Choix unique' : 'Choix multiple'}
                                </Badge>
                                <Text size="sm" fw={500}>{q.text}</Text>
                            </Group>

                            {q.type === 'RANKED_CHOICE' && (
                                <RankedOptions
                                    question={q}
                                    rankings={ranked[q.id] ?? {}}
                                    onChange={r => setRanked(prev => ({ ...prev, [q.id]: r }))}
                                />
                            )}

                            {q.type === 'SINGLE_CHOICE' && (
                                <Radio.Group
                                    value={single[q.id] ?? ''}
                                    onChange={val => setSingle(prev => ({ ...prev, [q.id]: val }))}
                                >
                                    <Stack gap="xs">
                                        {q.options.map(opt => (
                                            <Card key={opt.id} withBorder radius="md" p="xs" style={{ cursor: 'pointer' }}
                                                onClick={() => setSingle(prev => ({ ...prev, [q.id]: opt.id }))}>
                                                <Radio value={opt.id} label={opt.text} />
                                            </Card>
                                        ))}
                                    </Stack>
                                </Radio.Group>
                            )}

                            {q.type === 'MULTIPLE_CHOICE' && (
                                <Checkbox.Group
                                    value={multi[q.id] ?? []}
                                    onChange={vals => setMulti(prev => ({ ...prev, [q.id]: vals }))}
                                >
                                    <Stack gap="xs">
                                        {q.options.map(opt => (
                                            <Card key={opt.id} withBorder radius="md" p="xs" style={{ cursor: 'pointer' }}
                                                onClick={() => {
                                                    const cur = multi[q.id] ?? [];
                                                    setMulti(prev => ({
                                                        ...prev,
                                                        [q.id]: cur.includes(opt.id) ? cur.filter(id => id !== opt.id) : [...cur, opt.id],
                                                    }));
                                                }}>
                                                <Checkbox value={opt.id} label={opt.text} readOnly />
                                            </Card>
                                        ))}
                                    </Stack>
                                </Checkbox.Group>
                            )}
                        </Stack>
                    </Box>
                ))}

                <Button
                    fullWidth
                    loading={loading}
                    leftSection={<IconCheck size={16} />}
                    onClick={handleSubmit}
                >
                    Voter
                </Button>
            </Stack>
        </Card>
    );
}

export default function InlinePollVote({ polls: initialPolls }: { polls: Poll[] }) {
    // useState pour que la liste ne disparaisse pas quand Next.js re-render
    // le Server Component après la Server Action de vote
    const [polls] = useState(initialPolls);

    if (polls.length === 0) return null;
    return (
        <Stack gap="sm" w="100%" maw={480}>
            {polls.map(poll => <SinglePoll key={poll.id} poll={poll} />)}
        </Stack>
    );
}
