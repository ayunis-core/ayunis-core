import { artifactsControllerExport } from '@/shared/api';
import type { ExportFormatDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError } from '@/shared/lib/toast';
import { useCallback, useState } from 'react';

interface UseExportArtifactOptions {
  artifactId: string;
  title: string;
}

export function useExportArtifact({
  artifactId,
  title,
}: UseExportArtifactOptions) {
  const [isExporting, setIsExporting] = useState(false);

  const exportArtifact = useCallback(
    async (format: ExportFormatDto) => {
      setIsExporting(true);
      try {
        const data = await artifactsControllerExport(artifactId, { format });

        // The response is a file blob — trigger download
        const blob = new Blob([data as unknown as BlobPart]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        showError(`Failed to export as ${format.toUpperCase()}`);
      } finally {
        setIsExporting(false);
      }
    },
    [artifactId, title],
  );

  return { exportArtifact, isExporting };
}
