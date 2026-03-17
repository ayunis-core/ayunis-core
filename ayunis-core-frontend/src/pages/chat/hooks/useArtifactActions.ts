import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useArtifact } from '../api/useArtifact';
import { useUpdateArtifact } from '../api/useUpdateArtifact';
import { useRevertArtifact } from '../api/useRevertArtifact';
import { useExportArtifact } from '../api/useExportArtifact';
import { UpdateArtifactDtoAuthorType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { ArtifactsControllerExportFormat } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showSuccess } from '@/shared/lib/toast';

export function useArtifactActions(threadId: string) {
  const { t } = useTranslation('chat');
  const [openArtifactId, setOpenArtifactId] = useState<string | null>(null);

  const { artifact: openArtifact } = useArtifact(openArtifactId);

  const {
    updateArtifact: saveArtifact,
    updateArtifactAsync: saveArtifactAsync,
  } = useUpdateArtifact({
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
    (content: string) => {
      saveArtifact({ content, authorType: UpdateArtifactDtoAuthorType.USER });
    },
    [saveArtifact],
  );

  const handleRevertArtifact = useCallback(
    (versionNumber: number) => {
      revertArtifact(versionNumber);
    },
    [revertArtifact],
  );

  const handleExportArtifact = useCallback(
    (format: 'docx' | 'pdf', unsavedContent?: string) => {
      const doExport = async () => {
        if (unsavedContent) {
          await saveArtifactAsync({
            content: unsavedContent,
            authorType: UpdateArtifactDtoAuthorType.USER,
          });
        }
        await exportArtifact(format as ArtifactsControllerExportFormat);
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
