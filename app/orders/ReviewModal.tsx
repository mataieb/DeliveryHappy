'use client';

import {
    Modal,
    Stack,
    Text,
    Group,
    Textarea,
    Button,
    Divider,
    Box,
    Badge,
    UnstyledButton,
} from '@mantine/core';
import { IconStar, IconStarFilled, IconSend } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { submitOrderReviewAction, ItemRatingInput } from './actions';

type OrderItemForReview = {
    id: string;
    item: {
        name: string;
        category: string;
    };
};

type Props = {
    opened: boolean;
    onClose: () => void;
    orderId: string;
    orderItems: OrderItemForReview[];
};

const CATEGORY_LABELS: Record<string, string> = {
    STARTER: 'Entrée',
    MAIN: 'Plat',
    DESSERT: 'Dessert',
    DRINK: 'Boisson',
};

const CATEGORY_COLORS: Record<string, string> = {
    STARTER: 'teal',
    MAIN: 'blue',
    DESSERT: 'grape',
    DRINK: 'cyan',
};

function StarRating({
    value,
    onChange,
}: {
    value: number;
    onChange: (v: number) => void;
}) {
    const [hovered, setHovered] = useState(0);

    return (
        <Group gap={4}>
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= (hovered || value);
                return (
                    <UnstyledButton
                        key={star}
                        onClick={() => onChange(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                        style={{ lineHeight: 1, display: 'flex', alignItems: 'center' }}
                    >
                        {filled ? (
                            <IconStarFilled
                                size={28}
                                style={{
                                    color: 'var(--mantine-color-yellow-5)',
                                    transition: 'transform 0.1s',
                                    transform: hovered === star ? 'scale(1.2)' : 'scale(1)',
                                }}
                            />
                        ) : (
                            <IconStar
                                size={28}
                                style={{
                                    color: 'var(--mantine-color-gray-4)',
                                    transition: 'transform 0.1s',
                                    transform: hovered === star ? 'scale(1.2)' : 'scale(1)',
                                }}
                            />
                        )}
                    </UnstyledButton>
                );
            })}
        </Group>
    );
}

export default function ReviewModal({ opened, onClose, orderId, orderItems }: Props) {
    const [ratings, setRatings] = useState<Record<string, number>>({});
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const allRated = orderItems.length > 0 && orderItems.every((i) => ratings[i.id] >= 1);

    const handleClose = () => {
        setRatings({});
        setComment('');
        onClose();
    };

    const handleSubmit = async () => {
        if (!allRated) {
            notifications.show({
                title: 'Incomplet',
                message: 'Merci de noter chaque plat avant de valider.',
                color: 'orange',
            });
            return;
        }

        setLoading(true);
        try {
            const itemRatings: ItemRatingInput[] = orderItems.map((i) => ({
                orderItemId: i.id,
                rating: ratings[i.id],
            }));

            const res = await submitOrderReviewAction(orderId, itemRatings, comment || undefined);
            if (res.success) {
                notifications.show({
                    title: 'Merci !',
                    message: 'Votre avis a bien été enregistré. 🙏',
                    color: 'green',
                });
                handleClose();
            } else {
                notifications.show({
                    title: 'Erreur',
                    message: res.error ?? 'Une erreur est survenue.',
                    color: 'red',
                });
            }
        } catch {
            notifications.show({ title: 'Erreur', message: 'Erreur inattendue.', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap="xs">
                    <IconStarFilled size={20} style={{ color: 'var(--mantine-color-yellow-5)' }} />
                    <Text fw={700} size="lg">
                        Noter ma commande
                    </Text>
                </Group>
            }
            size="md"
            radius="md"
        >
            <Stack gap="lg">
                <Text size="sm" c="dimmed">
                    Donnez une note à chaque plat de votre commande. Votre retour aide à améliorer les prochains menus !
                </Text>

                <Stack gap="md">
                    {orderItems.map((orderItem, index) => (
                        <Box key={orderItem.id}>
                            {index > 0 && <Divider mb="md" />}
                            <Group justify="space-between" align="flex-start" mb="xs">
                                <Stack gap={2}>
                                    <Group gap="xs">
                                        <Badge
                                            size="xs"
                                            variant="light"
                                            color={CATEGORY_COLORS[orderItem.item.category] ?? 'gray'}
                                        >
                                            {CATEGORY_LABELS[orderItem.item.category] ?? orderItem.item.category}
                                        </Badge>
                                    </Group>
                                    <Text fw={600} size="sm">
                                        {orderItem.item.name}
                                    </Text>
                                </Stack>
                                <StarRating
                                    value={ratings[orderItem.id] ?? 0}
                                    onChange={(v) =>
                                        setRatings((prev) => ({ ...prev, [orderItem.id]: v }))
                                    }
                                />
                            </Group>
                            {ratings[orderItem.id] > 0 && (
                                <Text size="xs" c="dimmed" ta="right">
                                    {['', '😞 Très déçu', '😕 Peu satisfait', '😐 Correct', '😊 Bien', '🤩 Excellent !'][ratings[orderItem.id]]}
                                </Text>
                            )}
                        </Box>
                    ))}
                </Stack>

                <Divider />

                <Textarea
                    label="Commentaire libre (optionnel)"
                    placeholder="Un plat particulièrement réussi ? Une suggestion pour le chef ?"
                    minRows={3}
                    autosize
                    value={comment}
                    onChange={(e) => setComment(e.currentTarget.value)}
                />

                <Group justify="flex-end" mt="xs">
                    <Button variant="default" onClick={handleClose}>
                        Annuler
                    </Button>
                    <Button
                        leftSection={<IconSend size={16} />}
                        onClick={handleSubmit}
                        loading={loading}
                        disabled={!allRated}
                        color="yellow"
                        style={{ color: '#000' }}
                    >
                        Envoyer mon avis
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
