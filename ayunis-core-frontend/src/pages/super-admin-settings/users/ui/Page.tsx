import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import { axiosInstance } from '@/shared/api';
import { Button } from '@/shared/ui/shadcn/button';

export default function SuperAdminUsersPage() {
  const { t } = useTranslation('super-admin-settings-users');
  const { t: tLayout } = useTranslation('super-admin-settings-layout');
  const [isExporting, setIsExporting] = useState(false);

  const exportAdmins = async () => {
    setIsExporting(true);

    try {
      const response = await axiosInstance.get<Blob>(
        '/super-admin/users/export/admins.csv',
        {
          responseType: 'blob',
        },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'admin-users-export.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export admin users', error);
      toast.error(t('export.error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SuperAdminSettingsLayout pageTitle={tLayout('layout.users')}>
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <Button onClick={() => void exportAdmins()} disabled={isExporting}>
            <Download />
            {isExporting ? t('export.loading') : t('export.button')}
          </Button>
        </div>
      </div>
    </SuperAdminSettingsLayout>
  );
}
