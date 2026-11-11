import { artifactsControllerExport } from '@/shared/api';
import type { ArtifactsControllerExportFormat } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  trackProductiveOutcome,
  type ProductiveOutcome,
} from '@/shared/lib/openpanel-outcomes';
import { saveBlobAs } from '@/shared/lib/save-blob-as';
import { showError } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UseExportArtifactOptions {
  artifactId: string;
  threadId: string;
  title: string;
}

export function useExportArtifact({
  artifactId,
  threadId,
  title,
}: UseExportArtifactOptions) {
  const { t } = useTranslation('artifacts');
  const queryClient = useQueryClient();
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
        trackProductiveOutcome(queryClient, threadId, exportOutcome(format));
      } catch {
        showError(t('export.errorFormat', { format: format.toUpperCase() }));
      } finally {
        setIsExporting(false);
      }
    },
    [artifactId, threadId, title, t, queryClient],
  );

  return { exportArtifact, isExporting };
}

function exportOutcome(
  format: ArtifactsControllerExportFormat,
): ProductiveOutcome {
  return format === 'docx' || format === 'pdf'
    ? { outcome_type: 'artifact_exported', output_type: 'document', format }
    : { outcome_type: 'artifact_exported', output_type: 'spreadsheet', format };
}
