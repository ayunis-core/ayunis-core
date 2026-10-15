import { useTranslation } from 'react-i18next';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { RolesOverviewCard } from './RolesOverviewCard';
import { PermissionsCard } from './PermissionsCard';
import { TeamAdminPermissionsCard } from './TeamAdminPermissionsCard';

export function RolesSettingsPage() {
  const { t: tLayout } = useTranslation('admin-settings-layout');

  return (
    <SettingsLayout title={tLayout('layout.roles')}>
      <div className="space-y-6">
        <RolesOverviewCard />
        <PermissionsCard />
        <TeamAdminPermissionsCard />
      </div>
    </SettingsLayout>
  );
}
