import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useArtifact } from '@/pages/chat/api/useArtifact';
import { useUpdateArtifact } from '@/pages/chat/api/useUpdateArtifact';
import { useRevertArtifact } from '@/pages/chat/api/useRevertArtifact';
import { useExportArtifact } from '@/pages/chat/api/useExportArtifact';
import type { ArtifactsControllerExportFormat } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { UpdateArtifactDtoAuthorType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showSuccess } from '@/shared/lib/toast';

export function useArtifactActions(
  threadId: string,
  initialArtifactId?: string,
  workspaceId?: string | null,
) {
  const { t } = useTranslation('chat');
  const navigate = useNavigate();
  const openArtifactId = initialArtifactId ?? null;

  const {
    artifact: openArtifact,
    isLoading: isArtifactLoading,
    error: artifactError,
    refetch: refetchArtifact,
  } = useArtifact(openArtifactId);

  const { updateArtifactAsync: saveArtifactAsync } = useUpdateArtifact({
    artifactId: openArtifactId ?? '',
    threadId,
    workspaceId,
    onSuccess: () => showSuccess(t('chat.artifactSaved')),
  });

  const { revertArtifact } = useRevertArtifact({
    artifactId: openArtifactId ?? '',
    threadId,
    workspaceId,
  });

  const { exportArtifact, isExporting } = useExportArtifact({
    artifactId: openArtifactId ?? '',
    title: openArtifact?.title ?? 'document',
  });

  const handleOpenArtifact = useCallback(
    (artifactId: string) => {
      void navigate({
        to: '/chats/$threadId',
        params: { threadId },
        search: { artifactId },
        replace: true,
      });
    },
    [navigate, threadId],
  );

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
    void navigate({
      to: '/chats/$threadId',
      params: { threadId },
      search: { artifactId: undefined },
      replace: true,
    });
  }, [navigate, threadId]);

  const handleRetryArtifact = useCallback(() => {
    void refetchArtifact();
  }, [refetchArtifact]);

  const artifactPanel = {
    artifact: openArtifact,
    isLoading: isArtifactLoading,
    error: artifactError,
    onRetry: handleRetryArtifact,
    onClose: handleCloseArtifact,
  };

  return {
    artifactPanel,
    isArtifactPanelOpen: Boolean(openArtifactId),
    isExporting,
    handleOpenArtifact,
    handleSaveArtifact,
    handleRevertArtifact,
    handleExportArtifact,
    handleCloseArtifact,
  };
}
