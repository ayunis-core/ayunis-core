import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useArtifact } from '@/widgets/artifact-panel/api/useArtifact';
import { useUpdateArtifact } from '@/widgets/artifact-panel/api/useUpdateArtifact';
import { useRevertArtifact } from '@/widgets/artifact-panel/api/useRevertArtifact';
import { useExportArtifact } from '@/widgets/artifact-panel/api/useExportArtifact';
import type { ArtifactsControllerExportFormat } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showSuccess } from '@/shared/lib/toast';
import { useLetterheadChange } from './useLetterheadChange';
import { resolveArtifactTitle } from '@/widgets/artifact-panel/lib/resolve-artifact-title';

/**
 * Loads an artifact and wires the editing actions of `ArtifactPanel`. Pass the
 * chat's `threadId` when the artifact is open in a chat, so its productive
 * outcomes are tracked.
 */
export function useArtifactActions(
  artifactId: string | null,
  threadId?: string,
) {
  const { t } = useTranslation('artifacts');

  const {
    artifact: openArtifact,
    isLoading: isArtifactLoading,
    error: artifactError,
    refetch: refetchArtifact,
  } = useArtifact(artifactId);

  const { updateArtifactAsync: saveArtifactAsync } = useUpdateArtifact({
    artifactId: artifactId ?? '',
    threadId,
    artifactType: openArtifact?.type,
    onSuccess: () => showSuccess(t('editor.saved')),
  });

  const { revertArtifact } = useRevertArtifact({
    artifactId: artifactId ?? '',
  });

  const { exportArtifact, isExporting } = useExportArtifact({
    artifactId: artifactId ?? '',
    threadId,
    title: openArtifact ? resolveArtifactTitle(openArtifact) : 'document',
  });

  const { handleLetterheadChange } = useLetterheadChange(artifactId ?? '');

  const handleSaveArtifact = useCallback(
    async (content: string) => {
      await saveArtifactAsync({ content });
    },
    [saveArtifactAsync],
  );

  const handleRevertArtifact = useCallback(
    (versionNumber: number) => {
      revertArtifact(versionNumber);
    },
    [revertArtifact],
  );

  const handleExportArtifact = useCallback(
    (
      format: ArtifactsControllerExportFormat,
      unsavedContent?: string,
      versionNumber?: number,
    ) => {
      const doExport = async () => {
        if (unsavedContent !== undefined) {
          await saveArtifactAsync({ content: unsavedContent });
        }
        await exportArtifact(format, versionNumber);
      };
      void doExport();
    },
    [exportArtifact, saveArtifactAsync],
  );

  const handleRetryArtifact = useCallback(() => {
    void refetchArtifact();
  }, [refetchArtifact]);

  const artifactPanel = {
    artifact: openArtifact,
    isLoading: isArtifactLoading,
    error: artifactError,
    onRetry: handleRetryArtifact,
  };

  return {
    artifactPanel,
    isExporting,
    handleSaveArtifact,
    handleRevertArtifact,
    handleExportArtifact,
    handleLetterheadChange,
  };
}
