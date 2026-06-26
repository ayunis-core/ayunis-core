import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import { Button } from '@/shared/ui/shadcn/button';
import { useUserExport } from '../api/useUserExport';

export default function SuperAdminUsersPage() {
  const { t } = useTranslation('super-admin-settings-users');
  const { t: tLayout } = useTranslation('super-admin-settings-layout');
  const { exportAdmins, isExporting } = useUserExport();

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
            onClick={() => void exportAdmins()}
            disabled={isExporting}
          >
            <Download />
            {isExporting ? t('export.loading') : t('export.button')}
          </Button>
        </div>
      </div>
    </SuperAdminSettingsLayout>
  );
}
