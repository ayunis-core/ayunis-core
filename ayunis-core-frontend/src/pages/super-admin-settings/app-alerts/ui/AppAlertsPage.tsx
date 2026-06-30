import { useTranslation } from 'react-i18next';
import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import AppAlertSection from './AppAlertSection';

export default function AppAlertsPage() {
  const { t } = useTranslation('super-admin-settings-app-alerts');

  return (
    <SuperAdminSettingsLayout pageTitle={t('title')}>
      <div className="space-y-6">
        <AppAlertSection />
      </div>
    </SuperAdminSettingsLayout>
  );
}
