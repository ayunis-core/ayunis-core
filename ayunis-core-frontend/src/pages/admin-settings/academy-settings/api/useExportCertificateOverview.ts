import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { academyAccessControllerExportOrgCertificates } from '@/shared/api';
import type { CertificateValidityStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { saveBlobAs } from '@/shared/lib/save-blob-as';
import { showError } from '@/shared/lib/toast';

const EXPORT_FILE_NAME = 'Schulungsstatus_Ayunis_Core_KI-Schulung.csv';

interface ExportFilter {
  search?: string;
  status?: CertificateValidityStatus;
}

/** Downloads the overview as CSV with the same filters the table shows. */
export function useExportCertificateOverview({ search, status }: ExportFilter) {
  const { t } = useTranslation('admin-settings-academy');
  const [isExporting, setIsExporting] = useState(false);

  const exportOverview = useCallback(async () => {
    setIsExporting(true);
    try {
      const data = await academyAccessControllerExportOrgCertificates({
        search,
        status,
      });
      saveBlobAs(data, EXPORT_FILE_NAME);
    } catch {
      showError(t('overview.export.error'));
    } finally {
      setIsExporting(false);
    }
  }, [search, status, t]);

  return { exportOverview, isExporting };
}
