import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { academyCertificateControllerGetCertificate } from '@/shared/api';
import { showError } from '@/shared/lib/toast';

const CERTIFICATE_FILE_NAME = 'Ayunis-Core-KI-Fuehrerschein-Zertifikat.pdf';

export function useDownloadCertificate() {
  const { t } = useTranslation('academy');
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadCertificate = useCallback(async () => {
    setIsDownloading(true);
    try {
      const data = await academyCertificateControllerGetCertificate();

      // The response is a file blob — trigger download
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = CERTIFICATE_FILE_NAME;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showError(t('certificate.downloadError'));
    } finally {
      setIsDownloading(false);
    }
  }, [t]);

  return { downloadCertificate, isDownloading };
}
