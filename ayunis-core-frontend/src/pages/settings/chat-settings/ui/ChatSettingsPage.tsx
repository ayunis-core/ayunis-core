import { SettingsLayout } from '../../settings-layout';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { SpotlightTarget } from '@/shared/ui/spotlight-overlay/SpotlightTarget';
import { SPOTLIGHT_TARGET } from '@/shared/ui/spotlight-overlay/lib/spotlight-targets';
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
        <SpotlightTarget name={SPOTLIGHT_TARGET.systemPrompt}>
          <SystemPromptCard />
        </SpotlightTarget>
      </div>
    </SettingsLayout>
  );
}
