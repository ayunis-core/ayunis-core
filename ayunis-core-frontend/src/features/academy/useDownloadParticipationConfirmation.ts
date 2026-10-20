import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { academyCertificateControllerGetCertificate } from '@/shared/api';
import { saveBlobAs } from '@/shared/lib/save-blob-as';
import { showError } from '@/shared/lib/toast';

const PARTICIPATION_CONFIRMATION_FILE_NAME =
  'Teilnahmebestaetigung_Ayunis_Core_KI-Schulung.pdf';

export function useDownloadParticipationConfirmation() {
  const { t } = useTranslation('academy');
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadParticipationConfirmation = useCallback(async () => {
    setIsDownloading(true);
    try {
      const data = await academyCertificateControllerGetCertificate();
      saveBlobAs(data, PARTICIPATION_CONFIRMATION_FILE_NAME);
    } catch {
      showError(t('participationConfirmation.downloadError'));
    } finally {
      setIsDownloading(false);
    }
  }, [t]);

  return { downloadParticipationConfirmation, isDownloading };
}
