import { SettingsLayout } from '../../settings-layout';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { TourTarget } from '@/features/getting-started/lib/TourTarget';
import { TOUR_TARGET } from '@/features/getting-started/lib/tour-targets';
import { ChatSettingsCard } from './ChatSettingsCard';
import { SystemPromptCard } from './SystemPromptCard';

export default function ChatSettingsPage() {
  const { t } = useTranslation('settings');

  return (
    <SettingsLayout
      title={t('chat.title')}
      action={<HelpLink path="settings/account/chat/" />}
    >
      <div className="space-y-4">
        <ChatSettingsCard />
        <TourTarget name={TOUR_TARGET.systemPrompt}>
          <SystemPromptCard />
        </TourTarget>
      </div>
    </SettingsLayout>
  );
}
