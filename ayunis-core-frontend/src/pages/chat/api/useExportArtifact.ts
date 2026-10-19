import { artifactsControllerExport } from '@/shared/api';
import type { ArtifactsControllerExportFormat } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { saveBlobAs } from '@/shared/lib/save-blob-as';
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
    async (format: ArtifactsControllerExportFormat, versionNumber?: number) => {
      setIsExporting(true);
      try {
        const data = await artifactsControllerExport(artifactId, {
          format,
          versionNumber,
        });
        saveBlobAs(data, `${title}.${format}`);
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
