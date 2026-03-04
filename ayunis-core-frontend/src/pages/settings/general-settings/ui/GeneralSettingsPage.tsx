import { SettingsLayout } from '../../settings-layout';
import { useTranslation } from 'react-i18next';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
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
        <ThemeSettingsCard />
        <LanguageSettingsCard />
      </div>
    </SettingsLayout>
  );
}
