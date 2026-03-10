import { useTranslation } from 'react-i18next';
import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import CreditsPerEuroSection from './CreditsPerEuroSection';

export default function PlatformConfigPage() {
  const { t } = useTranslation('super-admin-settings-platform-config');

  return (
    <SuperAdminSettingsLayout pageTitle={t('title')}>
      <div className="space-y-6">
        <CreditsPerEuroSection />
      </div>
    </SuperAdminSettingsLayout>
  );
}
