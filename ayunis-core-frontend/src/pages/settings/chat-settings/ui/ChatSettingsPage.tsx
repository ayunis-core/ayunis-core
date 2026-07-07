import { SettingsLayout } from '../../settings-layout';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
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
        <OnboardingTourTarget name={TOUR_TARGET.systemPrompt}>
          <SystemPromptCard />
        </OnboardingTourTarget>
      </div>
    </SettingsLayout>
  );
}
