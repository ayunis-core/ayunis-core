import { useTranslation } from 'react-i18next';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { useUsageConfig } from '@/pages/admin-settings/usage-settings/api/useUsageConfig';
import { UsageOverview } from '@/widgets/usage-overview';
import { ownOrgUsageHooks } from '@/pages/admin-settings/usage-settings/lib/useOwnOrgUsageHooks';

export default function UsageSettingsPage() {
  const config = useUsageConfig();
  const { t } = useTranslation('admin-settings-layout');

  return (
    <SettingsLayout title={t('layout.usage')}>
      <UsageOverview
        hooks={ownOrgUsageHooks}
        showIndividualUsage={
          config.isFetchedAfterMount &&
          !config.isError &&
          config.data?.hideIndividualUsage === false
        }
      />
    </SettingsLayout>
  );
}
