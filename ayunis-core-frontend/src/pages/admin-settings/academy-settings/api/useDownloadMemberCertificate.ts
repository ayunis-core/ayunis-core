import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { academyAccessControllerGetOrgMemberCertificate } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { saveBlobAs } from '@/shared/lib/save-blob-as';
import { showError } from '@/shared/lib/toast';

const CERTIFICATE_FILE_NAME =
  'Teilnahmebestaetigung_Ayunis_Core_KI-Schulung.pdf';

const HTTP_TOO_MANY_REQUESTS = 429;

// A blob request also receives its JSON error body as a Blob, which hides the
// error code from extractErrorData until it is parsed back.
async function parseBlobErrorBody(error: unknown): Promise<unknown> {
  if (
    !(error instanceof AxiosError) ||
    !(error.response?.data instanceof Blob)
  ) {
    return error;
  }
  try {
    error.response.data = JSON.parse(
      await error.response.data.text(),
    ) as unknown;
  } catch {
    // A non-JSON body leaves the generic error message in place.
  }
  return error;
}

/** Downloads one member's Teilnahmebestätigung; one download runs at a time. */
export function useDownloadMemberCertificate() {
  const { t } = useTranslation('admin-settings-academy');
  const downloadInProgress = useRef(false);
  const [downloadingUserId, setDownloadingUserId] = useState<string | null>(
    null,
  );

  const showDownloadError = useCallback(
    async (error: unknown) => {
      try {
        const { code, status } = extractErrorData(
          await parseBlobErrorBody(error),
        );
        if (status === HTTP_TOO_MANY_REQUESTS) {
          showError(t('overview.certificate.rateLimited'));
        } else if (code === 'COMPLETION_NOT_FOUND') {
          showError(t('overview.certificate.notCompleted'));
        } else {
          showError(t('overview.certificate.error'));
        }
      } catch {
        showError(t('overview.certificate.error'));
      }
    },
    [t],
  );

  const downloadCertificate = useCallback(
    async (userId: string) => {
      if (downloadInProgress.current) return;
      downloadInProgress.current = true;
      setDownloadingUserId(userId);
      try {
        const data =
          await academyAccessControllerGetOrgMemberCertificate(userId);
        saveBlobAs(data, CERTIFICATE_FILE_NAME);
      } catch (error) {
        await showDownloadError(error);
      } finally {
        downloadInProgress.current = false;
        setDownloadingUserId(null);
      }
    },
    [showDownloadError],
  );

  return { downloadCertificate, downloadingUserId };
}
