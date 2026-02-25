import { getAllSettingsAction } from './actions';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const settings = await getAllSettingsAction();

    return (
        <SettingsClient initialTupperwareEnabled={settings.tupperwareEnabled} />
    );
}
