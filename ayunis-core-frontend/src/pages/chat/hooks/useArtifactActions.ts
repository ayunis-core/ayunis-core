import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useArtifact } from '../api/useArtifact';
import { useUpdateArtifact } from '../api/useUpdateArtifact';
import { useRevertArtifact } from '../api/useRevertArtifact';
import { useExportArtifact } from '../api/useExportArtifact';
import type { ArtifactsControllerExportFormat } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { UpdateArtifactDtoAuthorType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError, showSuccess } from '@/shared/lib/toast';
import { artifactsControllerSend } from '@/shared/api';
import { useMutation } from '@tanstack/react-query';

export function useArtifactActions(
  threadId: string,
  initialArtifactId?: string,
) {
  const { t } = useTranslation('chat');
  const navigate = useNavigate();
  const openArtifactId = initialArtifactId ?? null;

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

  const sendEmailMutation = useMutation({
    mutationFn: () => artifactsControllerSend(openArtifactId ?? ''),
    onSuccess: () => showSuccess(t('chat.emailSent')),
    onError: () => showError(t('chat.emailSendFailed')),
  });

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

  const handleSendEmailArtifact = useCallback(async () => {
    await sendEmailMutation.mutateAsync();
  }, [sendEmailMutation]);

  return {
    openArtifact,
    isExporting,
    handleOpenArtifact,
    handleSaveArtifact,
    handleRevertArtifact,
    handleExportArtifact,
    handleCloseArtifact,
    handleSendEmailArtifact,
    isSendingEmail: sendEmailMutation.isPending,
  };
}
