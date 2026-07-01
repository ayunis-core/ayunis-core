import { superAdminUserExportsControllerExportAdminUsers } from '@/shared/api';
import { showError } from '@/shared/lib/toast';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function useUserExport() {
  const { t } = useTranslation('super-admin-settings-users');
  const [isExporting, setIsExporting] = useState(false);

  const exportAdmins = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = await superAdminUserExportsControllerExportAdminUsers();

      // The response is a file blob — trigger download
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'admin-users-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showError(t('export.error'));
    } finally {
      setIsExporting(false);
    }
  }, [t]);

  return { exportAdmins, isExporting };
}
