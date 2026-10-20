import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { academyAccessControllerExportOrgCertificates } from '@/shared/api';
import type { CertificateValidityStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { saveBlobAs } from '@/shared/lib/save-blob-as';
import { showError } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

interface ExportFilter {
  search?: string;
  status?: CertificateValidityStatus;
}

export function useExportCertificateOverview({ search, status }: ExportFilter) {
  const { t } = useTranslation('admin-settings-academy');
  const exportInProgress = useRef(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportOverview = useCallback(async () => {
    if (exportInProgress.current) return;
    exportInProgress.current = true;
    setIsExporting(true);
    try {
      const data = await academyAccessControllerExportOrgCertificates({
        search,
        status,
      });
      saveBlobAs(data, t('overview.export.fileName'));
    } catch (error) {
      showError(t(exportErrorKey(error)));
    } finally {
      exportInProgress.current = false;
      setIsExporting(false);
    }
  }, [search, status, t]);

  return { exportOverview, isExporting };
}

function exportErrorKey(error: unknown) {
  try {
    const { status } = extractErrorData(error);
    return status === 429
      ? 'overview.export.rateLimited'
      : 'overview.export.error';
  } catch {
    return 'overview.export.error';
  }
}
