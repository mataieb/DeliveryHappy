'use client';

import { useState } from 'react';
import {
    Container, Title, Button, Group, Stack, Card, Badge, Text,
    ActionIcon, Drawer, TextInput, Textarea, Select, ScrollArea,
    Divider, Tooltip, Menu,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import {
    IconPlus, IconTrash, IconEye, IconChevronDown, IconLock, IconLockOpen, IconClipboardList,
} from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { PollStatus, PollQuestionType } from '@prisma/client';
import { createPollAction, updatePollStatusAction, deletePollAction, PollCreateInput } from './actions';

type DishOption = { id: string; name: string; imageUrl: string | null; category: string };
type PollOptionData = { id: string; text: string; order: number; dishLibraryItemId: string | null };
type PollQuestionData = { id: string; text: string; type: PollQuestionType; order: number; options: PollOptionData[] };
type Poll = {
    id: string;
    title: string;
    description: string | null;
    status: PollStatus;
    openAt: Date | null;
    closeAt: Date | null;
    createdAt: Date;
    questions: PollQuestionData[];
    _count: { votes: number };
};

const STATUS_LABELS: Record<PollStatus, string> = { DRAFT: 'Brouillon', OPEN: 'Ouvert', CLOSED: 'Clôturé' };
const STATUS_COLORS: Record<PollStatus, string> = { DRAFT: 'gray', OPEN: 'green', CLOSED: 'blue' };

const QUESTION_TYPES = [
    { value: 'RANKED_CHOICE', label: 'Classement (1er, 2ème…)' },
    { value: 'SINGLE_CHOICE', label: 'Choix unique' },
    { value: 'MULTIPLE_CHOICE', label: 'Choix multiple' },
];

type LocalOption = { text: string; dishLibraryItemId: string };
type LocalQuestion = { text: string; type: PollQuestionType; options: LocalOption[] };

const emptyQuestion = (): LocalQuestion => ({
    text: '',
    type: 'RANKED_CHOICE',
    options: [{ text: '', dishLibraryItemId: '' }, { text: '', dishLibraryItemId: '' }],
});

export default function PollsAdminClient({ polls, dishes }: { polls: Poll[]; dishes: DishOption[] }) {
    const [opened, { open, close }] = useDisclosure(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [openAt, setOpenAt] = useState<string | null>(null);
    const [closeAt, setCloseAt] = useState<string | null>(null);
    const [questions, setQuestions] = useState<LocalQuestion[]>([emptyQuestion()]);

    const dishSelectData = [
        { value: '', label: '— Texte libre —' },
        ...dishes.map(d => ({ value: d.id, label: d.name })),
    ];

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setOpenAt(null);
        setCloseAt(null);
        setQuestions([emptyQuestion()]);
    };

    const handleClose = () => { close(); resetForm(); };

    const addQuestion = () => setQuestions(qs => [...qs, emptyQuestion()]);
    const removeQuestion = (qi: number) => setQuestions(qs => qs.filter((_, i) => i !== qi));
    const updateQuestion = (qi: number, field: keyof Omit<LocalQuestion, 'options'>, value: any) =>
        setQuestions(qs => qs.map((q, i) => i === qi ? { ...q, [field]: value } : q));

    const addOption = (qi: number) =>
        setQuestions(qs => qs.map((q, i) => i === qi
            ? { ...q, options: [...q.options, { text: '', dishLibraryItemId: '' }] }
            : q));
    const removeOption = (qi: number, oi: number) =>
        setQuestions(qs => qs.map((q, i) => i === qi
            ? { ...q, options: q.options.filter((_, j) => j !== oi) }
            : q));
    const updateOption = (qi: number, oi: number, field: keyof LocalOption, value: string) =>
        setQuestions(qs => qs.map((q, i) => {
            if (i !== qi) return q;
            const opts = q.options.map((opt, j) => {
                if (j !== oi) return opt;
                if (field === 'dishLibraryItemId') {
                    const dish = dishes.find(d => d.id === value);
                    return { dishLibraryItemId: value, text: dish ? dish.name : opt.text };
                }
                return { ...opt, [field]: value };
            });
            return { ...q, options: opts };
        }));

    const handleSubmit = async () => {
        if (!title.trim()) {
            notifications.show({ title: 'Erreur', message: 'Le titre est requis', color: 'red' });
            return;
        }
        for (const q of questions) {
            if (!q.text.trim()) {
                notifications.show({ title: 'Erreur', message: 'Toutes les questions doivent avoir un texte', color: 'red' });
                return;
            }
            if (q.options.length < 2) {
                notifications.show({ title: 'Erreur', message: 'Chaque question doit avoir au moins 2 options', color: 'red' });
                return;
            }
            if (q.options.some(o => !o.text.trim())) {
                notifications.show({ title: 'Erreur', message: 'Toutes les options doivent avoir un texte', color: 'red' });
                return;
            }
        }

        if (closeAt && openAt && closeAt <= openAt) {
            notifications.show({ title: 'Erreur', message: 'La date de fermeture doit être après la date d\'ouverture', color: 'red' });
            return;
        }

        setLoading(true);
        try {
            const input: PollCreateInput = {
                title: title.trim(),
                description: description.trim() || undefined,
                openAt: openAt ?? undefined,
                closeAt: closeAt ?? undefined,
                questions: questions.map((q, qi) => ({
                    text: q.text,
                    type: q.type,
                    order: qi,
                    options: q.options.map((opt, oi) => ({
                        text: opt.text,
                        order: oi,
                        dishLibraryItemId: opt.dishLibraryItemId || undefined,
                    })),
                })),
            };
            const res = await createPollAction(input);
            if (res.success) {
                notifications.show({ title: 'Sondage créé', message: 'Pensez à l\'ouvrir pour que les utilisateurs puissent voter.', color: 'green' });
                handleClose();
            } else {
                notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Une erreur est survenue', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (pollId: string, status: PollStatus) => {
        const res = await updatePollStatusAction(pollId, status);
        if (!res.success) notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
    };

    const handleDelete = async (pollId: string) => {
        if (!confirm('Supprimer ce sondage et tous ses votes ?')) return;
        const res = await deletePollAction(pollId);
        if (!res.success) notifications.show({ title: 'Erreur', message: res.error, color: 'red' });
    };

    return (
        <Container fluid>
            <Group justify="space-between" mb="lg">
                <Title order={2}>Sondages</Title>
                <Button leftSection={<IconPlus size={14} />} onClick={open}>Nouveau sondage</Button>
            </Group>

            {polls.length === 0 ? (
                <Text c="dimmed">Aucun sondage pour le moment.</Text>
            ) : (
                <Stack>
                    {polls.map(poll => (
                        <Card key={poll.id} withBorder padding="md" radius="md">
                            <Group justify="space-between" wrap="nowrap">
                                <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                                    <Group gap="sm">
                                        <IconClipboardList size={16} color="gray" />
                                        <Text fw={600} truncate>{poll.title}</Text>
                                        <Badge color={STATUS_COLORS[poll.status]} size="sm">
                                            {STATUS_LABELS[poll.status]}
                                        </Badge>
                                    </Group>
                                    {poll.description && (
                                        <Text size="sm" c="dimmed" lineClamp={1}>{poll.description}</Text>
                                    )}
                                    <Text size="xs" c="dimmed">
                                        {poll.questions.length} question{poll.questions.length > 1 ? 's' : ''}
                                        {' · '}{poll._count.votes} vote{poll._count.votes > 1 ? 's' : ''}
                                        {poll.openAt && <> · Ouverture : {dayjs(poll.openAt).format('DD/MM HH:mm')}</>}
                                        {poll.closeAt && <> · Fermeture : {dayjs(poll.closeAt).format('DD/MM HH:mm')}</>}
                                    </Text>
                                </Stack>

                                <Group gap="xs" wrap="nowrap">
                                    <Tooltip label="Voir les résultats">
                                        <ActionIcon variant="subtle" color="blue" component={Link} href={`/admin/polls/${poll.id}`}>
                                            <IconEye size="1rem" />
                                        </ActionIcon>
                                    </Tooltip>

                                    <Menu shadow="md" width={180}>
                                        <Menu.Target>
                                            <Button size="xs" variant="light" rightSection={<IconChevronDown size={12} />}>
                                                Statut
                                            </Button>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            {poll.status !== 'DRAFT' && (
                                                <Menu.Item onClick={() => handleStatusChange(poll.id, 'DRAFT')}>
                                                    Passer en brouillon
                                                </Menu.Item>
                                            )}
                                            {poll.status !== 'OPEN' && (
                                                <Menu.Item color="green" leftSection={<IconLockOpen size={14} />} onClick={() => handleStatusChange(poll.id, 'OPEN')}>
                                                    Ouvrir les votes
                                                </Menu.Item>
                                            )}
                                            {poll.status !== 'CLOSED' && (
                                                <Menu.Item color="blue" leftSection={<IconLock size={14} />} onClick={() => handleStatusChange(poll.id, 'CLOSED')}>
                                                    Clôturer
                                                </Menu.Item>
                                            )}
                                        </Menu.Dropdown>
                                    </Menu>

                                    <Tooltip label="Supprimer">
                                        <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(poll.id)}>
                                            <IconTrash size="1rem" />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </Group>
                        </Card>
                    ))}
                </Stack>
            )}

            <Drawer
                opened={opened}
                onClose={handleClose}
                title="Nouveau sondage"
                position="right"
                size="lg"
                scrollAreaComponent={ScrollArea.Autosize}
            >
                <Stack pb="xl">
                    <TextInput
                        label="Titre"
                        placeholder="Votez pour les menus de la semaine !"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                    />
                    <Textarea
                        label="Description"
                        placeholder="Description optionnelle"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        autosize
                        minRows={2}
                    />

                    <Group grow>
                        <DateTimePicker
                            label="Ouverture automatique"
                            description="Laissez vide pour ouvrir manuellement"
                            placeholder="Date et heure"
                            value={openAt ? new Date(openAt) : null}
                            onChange={v => setOpenAt(v ? dayjs(v as any).toISOString() : null)}
                            clearable
                            minDate={new Date()}
                            valueFormat="DD/MM/YYYY HH:mm"
                        />
                        <DateTimePicker
                            label="Fermeture automatique"
                            description="Laissez vide pour fermer manuellement"
                            placeholder="Date et heure"
                            value={closeAt ? new Date(closeAt) : null}
                            onChange={v => setCloseAt(v ? dayjs(v as any).toISOString() : null)}
                            clearable
                            minDate={openAt ? new Date(openAt) : new Date()}
                            valueFormat="DD/MM/YYYY HH:mm"
                        />
                    </Group>

                    <Divider label="Questions" labelPosition="left" mt="sm" />

                    {questions.map((q, qi) => (
                        <Card key={qi} withBorder radius="md" p="md" bg="gray.0">
                            <Stack gap="sm">
                                <Group justify="space-between">
                                    <Text fw={500} size="sm">Question {qi + 1}</Text>
                                    {questions.length > 1 && (
                                        <ActionIcon size="sm" variant="subtle" color="red" onClick={() => removeQuestion(qi)}>
                                            <IconTrash size="0.9rem" />
                                        </ActionIcon>
                                    )}
                                </Group>

                                <TextInput
                                    placeholder="Ex: Quel plat préférez-vous ?"
                                    value={q.text}
                                    onChange={e => updateQuestion(qi, 'text', e.target.value)}
                                />

                                <Select
                                    label="Type de réponse"
                                    data={QUESTION_TYPES}
                                    value={q.type}
                                    onChange={val => updateQuestion(qi, 'type', val as PollQuestionType)}
                                    allowDeselect={false}
                                />

                                <Text size="xs" fw={600} c="dimmed" tt="uppercase" mt={4}>Options</Text>
                                <Stack gap="xs">
                                    {q.options.map((opt, oi) => (
                                        <Group key={oi} gap="xs" wrap="nowrap">
                                            {dishes.length > 0 && (
                                                <Select
                                                    placeholder="Bibliothèque"
                                                    data={dishSelectData}
                                                    value={opt.dishLibraryItemId || ''}
                                                    onChange={val => updateOption(qi, oi, 'dishLibraryItemId', val || '')}
                                                    style={{ width: 160 }}
                                                    size="xs"
                                                    clearable
                                                />
                                            )}
                                            <TextInput
                                                placeholder={`Option ${oi + 1}`}
                                                value={opt.text}
                                                onChange={e => updateOption(qi, oi, 'text', e.target.value)}
                                                style={{ flex: 1 }}
                                                size="xs"
                                            />
                                            {q.options.length > 2 && (
                                                <ActionIcon size="sm" variant="subtle" color="red" onClick={() => removeOption(qi, oi)}>
                                                    <IconTrash size="0.9rem" />
                                                </ActionIcon>
                                            )}
                                        </Group>
                                    ))}
                                    <Button size="xs" variant="subtle" leftSection={<IconPlus size={12} />} onClick={() => addOption(qi)}>
                                        Ajouter une option
                                    </Button>
                                </Stack>
                            </Stack>
                        </Card>
                    ))}

                    <Button variant="subtle" leftSection={<IconPlus size={14} />} onClick={addQuestion}>
                        Ajouter une question
                    </Button>

                    <Divider mt="sm" />

                    <Group justify="flex-end">
                        <Button variant="default" onClick={handleClose}>Annuler</Button>
                        <Button loading={loading} onClick={handleSubmit}>Créer le sondage</Button>
                    </Group>
                </Stack>
            </Drawer>
        </Container>
    );
}
