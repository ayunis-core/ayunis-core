import { superAdminUserExportsControllerExportUsers } from '@/shared/api';
import { saveBlobAs } from '@/shared/lib/save-blob-as';
import { showError } from '@/shared/lib/toast';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function useUserExport() {
  const { t } = useTranslation('super-admin-settings-users');
  const [isExporting, setIsExporting] = useState(false);

  const exportUsers = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = await superAdminUserExportsControllerExportUsers();
      saveBlobAs(data, 'users-export.csv');
    } catch {
      showError(t('export.error'));
    } finally {
      setIsExporting(false);
    }
  }, [t]);

  return { exportUsers, isExporting };
}
