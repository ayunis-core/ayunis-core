import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getSkillSourcesControllerGetSkillSourcesQueryKey,
  skillSourcesControllerCompleteUpload,
  skillSourcesControllerCreateUpload,
  useSkillSourcesControllerGetSkillSources,
  useSkillSourcesControllerRemoveSource,
} from '@/shared/api/generated/ayunisCoreAPI';
import { SkillSourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { useDirectSourceUpload } from '@/shared/lib/source-upload';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useProcessingPollInterval } from '@/shared/lib/processing-poll';

export function useWorkspaceSkillSources({ skillId }: { skillId: string }) {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();
  const queryKey = getSkillSourcesControllerGetSkillSourcesQueryKey(skillId);
  const processingPollInterval = useProcessingPollInterval();

  const { data: sources = [], isLoading: isLoadingSources } =
    useSkillSourcesControllerGetSkillSources(skillId, {
      query: {
        staleTime: 0,
        refetchInterval: (query) =>
          processingPollInterval(
            (query.state.data ?? []).some(
              (source) =>
                source.status === SkillSourceResponseDtoStatus.processing,
            ),
          ),
      },
    });

  const { upload, uploads, isUploading } = useDirectSourceUpload(
    {
      createSession: (file, signal) =>
        skillSourcesControllerCreateUpload(
          skillId,
          { fileName: file.name, mimeType: file.type, fileSize: file.size },
          signal,
        ),
      complete: (uploadId, signal) =>
        skillSourcesControllerCompleteUpload(skillId, uploadId, signal),
    },
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey });
        showSuccess(t('sources.addedSuccessfully'));
      },
      onError: (error) => handleSourceUploadError(error, t),
    },
  );

  const removeMutation = useSkillSourcesControllerRemoveSource({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey });
        showSuccess(t('sources.removedSuccessfully'));
      },
      onError: () => showError(t('sources.failedToRemove')),
    },
  });

  return {
    sources,
    isLoadingSources,
    addFileSource: ({ data }: { id: string; data: { file: File } }) =>
      upload(data.file),
    addFileSourcePending: isUploading,
    uploads,
    removeSource: (sourceId: string) =>
      removeMutation.mutate({ id: skillId, sourceId }),
    removeSourcePending: removeMutation.isPending,
  };
}
