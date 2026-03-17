'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Taieb\'s Kitchen <onboarding@resend.dev>';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// ─── Email template ───────────────────────────────────────────────────────────

function buildMenuEmailHtml(menuDate: string, items: { name: string; price: number; category: string; description?: string | null }[]) {
    const CATEGORY_LABELS: Record<string, string> = {
        STARTER: 'Entrée', MAIN: 'Plat', DESSERT: 'Dessert', DRINK: 'Boisson',
    };
    const CATEGORY_COLORS: Record<string, string> = {
        STARTER: '#40c057', MAIN: '#228be6', DESSERT: '#e64980', DRINK: '#fab005',
    };

    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;">
                    <tr>
                        <td style="width:100%; word-break:break-word; overflow-wrap:break-word; padding-right:16px;">
                            <span style="display:inline-block; background:${CATEGORY_COLORS[item.category] || '#868e96'}; color:white; font-size:11px; font-weight:600; padding:2px 8px; border-radius:20px; margin-bottom:4px;">
                                ${CATEGORY_LABELS[item.category] || item.category}
                            </span>
                            <br/>
                            <strong style="font-size:15px; color:#1a1a2e; line-height:1.4;">${item.name}</strong>
                        </td>
                        <td align="right" style="vertical-align:middle; white-space:nowrap; width:72px;">
                            <strong style="font-size:16px; color:#4c6ef5;">${item.price.toFixed(2)}&nbsp;€</strong>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f8f9fa; font-family: 'Segoe UI', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa; padding: 32px 16px;">
        <tr><td align="center">
            <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px; width:100%;">

                <!-- Header -->
                <tr><td style="background: linear-gradient(135deg, #4c6ef5 0%, #15aabf 100%); border-radius:16px 16px 0 0; padding:32px; text-align:center;">
                    <h1 style="margin:0; color:white; font-size:24px; font-weight:700; letter-spacing:-0.5px;">
                        Le menu du ${menuDate} est disponible !
                    </h1>
                    <p style="margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:15px;">
                        Taieb's Kitchen
                    </p>
                </td></tr>

                <!-- Body -->
                <tr><td style="background:white; padding:24px 20px;">
                    <p style="margin:0 0 20px; color:#495057; font-size:15px;">
                        Bonjour 👋 <br />
                        Le menu de <strong>${menuDate}</strong> vient d'être publié.
                        Découvrez ce qui vous attend et passez votre commande avant la clôture !
                    </p>

                    <h2 style="margin:0 0 16px; font-size:17px; color:#1a1a2e; border-bottom: 2px solid #4c6ef5; padding-bottom:8px;">
                        🗒️ Au menu
                    </h2>

                    <table width="100%" cellpadding="0" cellspacing="0">
                        ${itemsHtml}
                    </table>

                    <!-- CTA -->
                    <div style="text-align:center; margin:28px 0 8px;">
                        <a href="${APP_URL}/menu"
                           style="display:inline-block; background: linear-gradient(135deg, #4c6ef5, #15aabf); color:white; text-decoration:none; padding:14px 36px; border-radius:50px; font-size:16px; font-weight:700; letter-spacing:0.3px; box-shadow: 0 4px 15px rgba(76,110,245,0.35);">
                            Commander maintenant
                        </a>
                    </div>
                    <p style="text-align:center; color:#adb5bd; font-size:12px; margin:12px 0 0;">
                        Les commandes ferment la veille à 21h00.
                    </p>
                </td></tr>

                <!-- Footer -->
                <tr><td style="background:#f8f9fa; border-radius:0 0 16px 16px; padding:20px 32px; text-align:center;">
                    <p style="margin:0; color:#adb5bd; font-size:12px;">
                        Taieb's Kitchen · Vous recevez cet email car vous êtes inscrit au service de commande de repas.
                    </p>
                </td></tr>

            </table>
        </td></tr>
    </table>
</body>
</html>`;
}

// ─── Send function ────────────────────────────────────────────────────────────

export async function sendMenuNotificationEmails(
    menuDate: string,
    items: { name: string; price: number; category: string; description?: string | null }[],
    recipients: { email: string; name?: string | null }[]
) {
    if (!process.env.RESEND_API_KEY) {
        return { success: false, error: 'RESEND_API_KEY non configurée dans les variables d\'environnement.' };
    }
    if (recipients.length === 0) {
        return { success: false, error: 'Aucun utilisateur à notifier.' };
    }

    const html = buildMenuEmailHtml(menuDate, items);
    const testRecipient = process.env.RESEND_TEST_RECIPIENT;

    // ── Test mode: redirect all emails to a single address ──────────────────
    if (testRecipient) {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: testRecipient,
            subject: `🍽️ Menu du ${menuDate} — Passez votre commande !`,
            html,
        });
        if (error) {
            console.error('[Resend] API error (test mode):', JSON.stringify(error));
            return { success: false, error: `Resend : ${error.message}` };
        }
        console.log('[Resend] Test email sent, id:', data?.id);
        return { success: true, sent: 1, testMode: true, testRecipient };
    }

    // ── Production mode ─────────────────────────────────────────────────────
    const emails = recipients.map(r => r.email).filter(Boolean);

    try {
        const CHUNK_SIZE = 50;
        let totalSent = 0;

        for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
            const chunk = emails.slice(i, i + CHUNK_SIZE);

            const { data, error } = await resend.emails.send({
                from: FROM_EMAIL,
                to: chunk,
                subject: `🍽️ Menu du ${menuDate} — Passez votre commande !`,
                html,
            });

            if (error) {
                console.error('[Resend] API error:', JSON.stringify(error));
                return { success: false, error: `Resend : ${error.message}` };
            }

            console.log('[Resend] Sent to chunk, id:', data?.id);
            totalSent += chunk.length;
        }

        return { success: true, sent: totalSent };
    } catch (error: any) {
        console.error('[Resend] Unexpected error:', error);
        return { success: false, error: error?.message || 'Erreur inattendue lors de l\'envoi.' };
    }
}

// ─── Weekly email template ────────────────────────────────────────────────────

type DayMenu = {
    date: string;       // ex: "Lundi 10 mars 2025"
    dayShort: string;   // ex: "Lun."
    items: { name: string; price: number; category: string; description?: string | null }[];
};

const CATEGORY_LABELS: Record<string, string> = {
    STARTER: 'Entrée', MAIN: 'Plat', DESSERT: 'Dessert', DRINK: 'Boisson',
};
const CATEGORY_COLORS: Record<string, string> = {
    STARTER: '#40c057', MAIN: '#228be6', DESSERT: '#e64980', DRINK: '#fab005',
};
const DAY_COLORS: Record<string, string> = {
    'Lundi': '#4c6ef5', 'Mardi': '#7950f2', 'Mercredi': '#e64980',
    'Jeudi': '#f76707', 'Vendredi': '#2f9e44',
};

function buildWeeklyMenuEmailHtml(weekLabel: string, days: DayMenu[]) {
    const daysHtml = days.map(day => {
        const dayKey = day.date.split(' ')[0]; // "Lundi", "Mardi"...
        const color = DAY_COLORS[dayKey] || '#4c6ef5';

        const itemsRows = day.items.map(item => `
            <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #f4f4f4;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>
                        <td style="width:100%; word-break:break-word; overflow-wrap:break-word; padding-right:16px;">
                            <span style="display:inline-block; background:${CATEGORY_COLORS[item.category] || '#868e96'}; color:white; font-size:10px; font-weight:700; padding:1px 7px; border-radius:20px; margin-bottom:2px; text-transform:uppercase; letter-spacing:0.5px;">
                                ${CATEGORY_LABELS[item.category] || item.category}
                            </span><br/>
                            <span style="font-size:13px; font-weight:600; color:#1a1a2e; line-height:1.4;">${item.name}</span>
                            ${item.description ? `<br/><span style="font-size:11px; color:#adb5bd; font-style:italic;">${item.description}</span>` : ''}
                        </td>
                        <td align="right" style="vertical-align:middle; white-space:nowrap; width:68px;">
                            <span style="font-size:13px; font-weight:700; color:${color};">${item.price.toFixed(2)}&nbsp;€</span>
                        </td>
                    </tr></table>
                </td>
            </tr>
        `).join('');

        return `
            <tr><td style="padding: 10px 0 4px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding: 10px 14px; background: linear-gradient(135deg, ${color}22, ${color}11); border-left: 4px solid ${color}; border-radius: 0 8px 8px 0;">
                            <span style="font-size:15px; font-weight:700; color:${color}; text-transform:capitalize;">${day.date}</span>
                        </td>
                    </tr>
                    <tr><td style="padding: 4px 0 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            ${itemsRows}
                        </table>
                    </td></tr>
                </table>
            </td></tr>
        `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f8f9fa; font-family: 'Segoe UI', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa; padding: 32px 16px;">
        <tr><td align="center">
            <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px; width:100%;">

                <!-- Header -->
                <tr><td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%); border-radius:16px 16px 0 0; padding:36px 32px; text-align:center;">
                    <div style="font-size:36px; margin-bottom:12px;">🗓️</div>
                    <h1 style="margin:0; color:white; font-size:22px; font-weight:800; letter-spacing:-0.5px; line-height:1.3;">
                        Les menus de la semaine<br/>sont disponibles !
                    </h1>
                    <div style="margin:12px 0 0; display:inline-block; background:rgba(255,255,255,0.12); border-radius:20px; padding:5px 16px;">
                        <span style="color:rgba(255,255,255,0.9); font-size:14px; font-weight:500;">${weekLabel}</span>
                    </div>
                </td></tr>

                <!-- Body -->
                <tr><td style="background:white; padding:24px 28px;">
                    <p style="margin:0 0 20px; color:#495057; font-size:14px; line-height:1.6;">
                        👋 Voici le programme de la semaine chez <strong>Taieb's Kitchen</strong>.<br/>
                        Passez vos commandes avant la veille à <strong>21h00</strong> !
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0">
                        ${daysHtml}
                    </table>

                    <!-- CTA -->
                    <div style="text-align:center; margin:28px 0 8px;">
                        <a href="${APP_URL}/menu"
                           style="display:inline-block; background: linear-gradient(135deg, #4c6ef5, #15aabf); color:white; text-decoration:none; padding:14px 40px; border-radius:50px; font-size:15px; font-weight:700; letter-spacing:0.3px; box-shadow: 0 4px 20px rgba(76,110,245,0.4);">
                        Commander maintenant
                        </a>
                    </div>
                </td></tr>

                <!-- Footer -->
                <tr><td style="background:#f8f9fa; border-radius:0 0 16px 16px; padding:18px 28px; text-align:center; border-top: 1px solid #e9ecef;">
                    <p style="margin:0; color:#adb5bd; font-size:11px; line-height:1.6;">
                        Taieb's Kitchen · Vous recevez cet email car vous êtes inscrit au service.<br/>
                        Les commandes ferment chaque jour la veille à 21h00.
                    </p>
                </td></tr>

            </table>
        </td></tr>
    </table>
</body>
</html>`;
}

export async function sendWeeklyMenuNotificationEmails(
    weekLabel: string,
    days: DayMenu[],
    recipients: { email: string; name?: string | null }[]
) {
    if (!process.env.RESEND_API_KEY) {
        return { success: false, error: 'RESEND_API_KEY non configurée.' };
    }
    if (recipients.length === 0) {
        return { success: false, error: 'Aucun utilisateur à notifier.' };
    }

    const html = buildWeeklyMenuEmailHtml(weekLabel, days);
    const testRecipient = process.env.RESEND_TEST_RECIPIENT;

    // ── Test mode ────────────────────────────────────────────────────────────
    if (testRecipient) {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: testRecipient,
            subject: `🗓️ Menus de la semaine — ${weekLabel}`,
            html,
        });
        if (error) return { success: false, error: `Resend : ${error.message}` };
        console.log('[Resend] Weekly test email sent, id:', data?.id);
        return { success: true, sent: 1, testMode: true, testRecipient };
    }

    // ── Production mode ──────────────────────────────────────────────────────
    const emails = recipients.map(r => r.email).filter(Boolean);
    try {
        const CHUNK_SIZE = 50;
        let totalSent = 0;
        for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
            const chunk = emails.slice(i, i + CHUNK_SIZE);
            const { data, error } = await resend.emails.send({
                from: FROM_EMAIL,
                to: chunk,
                subject: `🗓️ Menus de la semaine — ${weekLabel}`,
                html,
            });
            if (error) return { success: false, error: `Resend : ${error.message}` };
            console.log('[Resend] Weekly email chunk sent, id:', data?.id);
            totalSent += chunk.length;
        }
        return { success: true, sent: totalSent };
    } catch (error: any) {
        console.error('[Resend] Unexpected error (weekly):', error);
        return { success: false, error: error?.message || 'Erreur inattendue.' };
    }
}
