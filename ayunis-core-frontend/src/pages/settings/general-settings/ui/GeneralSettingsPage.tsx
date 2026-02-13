import { SettingsLayout } from '../../settings-layout';
import { useTranslation } from 'react-i18next';
import { ThemeSettingsCard } from './ThemeSettingsCard';
import { LanguageSettingsCard } from './LanguageSettingsCard';

export default function GeneralSettingsPage() {
  const { t } = useTranslation('settings');

  return (
    <SettingsLayout title={t('general.title')}>
      <div className="space-y-4">
        <ThemeSettingsCard />
        <LanguageSettingsCard />
      </div>
    </SettingsLayout>
  );
}
