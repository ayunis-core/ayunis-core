import { useTranslation } from 'react-i18next';
import SuperAdminSettingsLayout from '@/pages/super-admin-settings/super-admin-settings-layout';
import AddSuperAdminDialog from './AddSuperAdminDialog';
import SuperAdminsTable from './SuperAdminsTable';
import type { SuperAdminUserResponseDto } from '@ayunis/api-client';

interface SuperAdminSuperAdminsPageProps {
  superAdmins: SuperAdminUserResponseDto[];
}

export default function SuperAdminSuperAdminsPage({
  superAdmins,
}: Readonly<SuperAdminSuperAdminsPageProps>) {
  const { t } = useTranslation('super-admin-settings-layout');

  return (
    <SuperAdminSettingsLayout
      pageTitle={t('layout.superAdmins')}
      action={<AddSuperAdminDialog />}
    >
      <SuperAdminsTable superAdmins={superAdmins} />
    </SuperAdminSettingsLayout>
  );
}
