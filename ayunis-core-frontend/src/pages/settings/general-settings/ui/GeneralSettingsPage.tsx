import { SettingsLayout } from '../../settings-layout';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { SpotlightTarget } from '@/shared/ui/spotlight-overlay/SpotlightTarget';
import { SPOTLIGHT_TARGET } from '@/shared/ui/spotlight-overlay/lib/spotlight-targets';
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
        <SpotlightTarget name={SPOTLIGHT_TARGET.themeSettings}>
          <ThemeSettingsCard />
        </SpotlightTarget>
        <LanguageSettingsCard />
      </div>
    </SettingsLayout>
  );
}
