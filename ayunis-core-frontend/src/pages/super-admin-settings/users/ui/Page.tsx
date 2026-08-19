import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import SuperAdminSettingsLayout from '@/pages/super-admin-settings/super-admin-settings-layout';
import { useUserExport } from '@/pages/super-admin-settings/users/api/useUserExport';
import type {
  PaginationDto,
  SuperAdminUserListItemResponseDto,
} from '@/shared/api';
import { UsersTable } from './UsersTable';

interface SuperAdminUsersPageProps {
  users: SuperAdminUserListItemResponseDto[];
  pagination?: PaginationDto;
  search?: string;
  currentPage: number;
}

export default function SuperAdminUsersPage({
  users,
  pagination,
  search,
  currentPage,
}: Readonly<SuperAdminUsersPageProps>) {
  const { t } = useTranslation('super-admin-settings-users');
  const { t: tLayout } = useTranslation('super-admin-settings-layout');
  const { exportUsers, isExporting } = useUserExport();

  return (
    <SuperAdminSettingsLayout pageTitle={tLayout('layout.users')}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">{t('export.title')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('export.description')}
            </p>
          </div>
          <Button
            className="sm:shrink-0"
            onClick={() => void exportUsers()}
            disabled={isExporting}
          >
            <Download />
            {isExporting ? t('export.loading') : t('export.button')}
          </Button>
        </div>
        <UsersTable
          users={users}
          pagination={pagination}
          search={search}
          currentPage={currentPage}
        />
      </div>
    </SuperAdminSettingsLayout>
  );
}
