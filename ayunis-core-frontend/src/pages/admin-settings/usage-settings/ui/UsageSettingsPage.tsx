import { useTranslation } from 'react-i18next';
import SettingsLayout from '../../admin-settings-layout';
import { UsageOverview } from '@/widgets/usage-overview';
import { ownOrgUsageHooks } from '../lib/useOwnOrgUsageHooks';

export default function UsageSettingsPage() {
  const { t } = useTranslation('admin-settings-layout');

  return (
    <SettingsLayout title={t('layout.usage')}>
      <UsageOverview hooks={ownOrgUsageHooks} />
    </SettingsLayout>
  );
}
