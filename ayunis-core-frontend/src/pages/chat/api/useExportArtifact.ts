import { artifactsControllerExport } from '@/shared/api';
import type { ExportFormatDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError } from '@/shared/lib/toast';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UseExportArtifactOptions {
  artifactId: string;
  title: string;
}

export function useExportArtifact({
  artifactId,
  title,
}: UseExportArtifactOptions) {
  const { t } = useTranslation('artifacts');
  const [isExporting, setIsExporting] = useState(false);

  const exportArtifact = useCallback(
    async (format: ExportFormatDto) => {
      setIsExporting(true);
      try {
        const data = await artifactsControllerExport(artifactId, { format });

        // The response is a file blob — trigger download
        const blob = data instanceof Blob ? data : new Blob([data]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        showError(t('export.errorFormat', { format: format.toUpperCase() }));
      } finally {
        setIsExporting(false);
      }
    },
    [artifactId, title, t],
  );

  return { exportArtifact, isExporting };
}
