import { useTranslation } from 'react-i18next';
import SettingsLayout from '../../admin-settings-layout';
import { CreditUsageCard } from './CreditUsageCard';
import { UserUsageTable } from '@/pages/admin-settings/usage-settings/ui/user-usage-table';

export default function UsageSettingsPage() {
  const { t } = useTranslation('admin-settings-layout');

  return (
    <SettingsLayout title={t('layout.usage')}>
      <div className="space-y-8">
        <CreditUsageCard />

        <UserUsageTable />
      </div>
    </SettingsLayout>
  );
}
