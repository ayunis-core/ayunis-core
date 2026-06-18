import { SettingsLayout } from '../../settings-layout';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { TourTarget } from '@/features/getting-started/lib/TourTarget';
import { TOUR_TARGET } from '@/features/getting-started/lib/tour-targets';
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
        <TourTarget name={TOUR_TARGET.themeSettings}>
          <ThemeSettingsCard />
        </TourTarget>
        <LanguageSettingsCard />
      </div>
    </SettingsLayout>
  );
}
