import { SettingsLayout } from '../../settings-layout';
import { useTranslation } from 'react-i18next';
import { ChatSettingsCard } from './ChatSettingsCard';

export default function ChatSettingsPage() {
  const { t } = useTranslation('settings');

  return (
    <SettingsLayout title={t('chat.title')}>
      <div className="space-y-4">
        <ChatSettingsCard />
      </div>
    </SettingsLayout>
  );
}
