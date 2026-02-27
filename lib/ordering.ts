/**
 * Returns true if ordering is still open for a given menu date.
 *
 * Rule: orders close at 21:00 (9 PM) the day BEFORE the menu date.
 *
 * Example: menu is on Tuesday → deadline is Monday at 21:00.
 */
export function isOrderingOpen(menuDate: Date): boolean {
    const deadline = new Date(menuDate);
    deadline.setDate(deadline.getDate() - 1); // Day before
    deadline.setHours(21, 0, 0, 0);           // Set to 21:00:00
    return new Date() < deadline;
}

/**
 * Returns a human-readable deadline string.
 * e.g. "lundi 3 mars à 21h00"
 */
export function orderingDeadline(menuDate: Date): string {
    const deadline = new Date(menuDate);
    deadline.setDate(deadline.getDate() - 1);
    deadline.setHours(21, 0, 0, 0);

    return deadline.toLocaleString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });
}
