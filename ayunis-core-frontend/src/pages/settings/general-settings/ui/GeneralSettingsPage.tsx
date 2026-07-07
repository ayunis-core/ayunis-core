import { SettingsLayout } from '../../settings-layout';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import { ThemeSettingsCard } from './ThemeSettingsCard';
import { LanguageSettingsCard } from './LanguageSettingsCard';

export default function GeneralSettingsPage() {
  const { t } = useTranslation('settings');

  return (
    <SettingsLayout
      title={t('general.title')}
      action={<HelpLink path="settings/account/general/" />}
    >
      <div className="space-y-4">
        <OnboardingTourTarget name={TOUR_TARGET.themeSettings}>
          <ThemeSettingsCard />
        </OnboardingTourTarget>
        <LanguageSettingsCard />
      </div>
    </SettingsLayout>
  );
}
