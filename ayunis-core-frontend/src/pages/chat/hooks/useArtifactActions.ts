import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useArtifact } from '../api/useArtifact';
import { useUpdateArtifact } from '../api/useUpdateArtifact';
import { useRevertArtifact } from '../api/useRevertArtifact';
import { useExportArtifact } from '../api/useExportArtifact';
import type { ArtifactsControllerExportFormat } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { UpdateArtifactDtoAuthorType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showSuccess } from '@/shared/lib/toast';

export function useArtifactActions(threadId: string) {
  const { t } = useTranslation('chat');
  const [openArtifactId, setOpenArtifactId] = useState<string | null>(null);

  const { artifact: openArtifact } = useArtifact(openArtifactId);

  const { updateArtifactAsync: saveArtifactAsync } = useUpdateArtifact({
    artifactId: openArtifactId ?? '',
    threadId,
    onSuccess: () => showSuccess(t('chat.artifactSaved')),
  });

  const { revertArtifact } = useRevertArtifact({
    artifactId: openArtifactId ?? '',
    threadId,
  });

  const { exportArtifact, isExporting } = useExportArtifact({
    artifactId: openArtifactId ?? '',
    title: openArtifact?.title ?? 'document',
  });

  const handleOpenArtifact = useCallback((artifactId: string) => {
    setOpenArtifactId(artifactId);
  }, []);

  const handleSaveArtifact = useCallback(
    async (content: string) => {
      await saveArtifactAsync({
        content,
        authorType: UpdateArtifactDtoAuthorType.USER,
      });
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
          await saveArtifactAsync({
            content: unsavedContent,
            authorType: UpdateArtifactDtoAuthorType.USER,
          });
        }
        await exportArtifact(format, versionNumber);
      };
      void doExport();
    },
    [exportArtifact, saveArtifactAsync],
  );

  const handleCloseArtifact = useCallback(() => {
    setOpenArtifactId(null);
  }, []);

  return {
    openArtifact,
    isExporting,
    handleOpenArtifact,
    handleSaveArtifact,
    handleRevertArtifact,
    handleExportArtifact,
    handleCloseArtifact,
  };
}
