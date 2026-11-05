import {
  skillSourcesControllerCompleteUpload,
  skillSourcesControllerCreateUpload,
  useSkillSourcesControllerGetSkillSources,
  useSkillSourcesControllerRemoveSource,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { SkillSourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { useDirectSourceUpload } from '@/shared/lib/source-upload';
import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useProcessingPollInterval } from '@/shared/lib/processing-poll';

export default function useSkillSources({
  skill,
}: {
  skill: SkillResponseDto;
}) {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();
  const processingPollInterval = useProcessingPollInterval();

  const { data: sources = [], isLoading: isLoadingSources } =
    useSkillSourcesControllerGetSkillSources(skill.id, {
      query: {
        staleTime: 0,
        refetchInterval: (query) => {
          const data = query.state.data ?? [];
          const hasProcessing = data.some(
            (s) => s.status === SkillSourceResponseDtoStatus.processing,
          );
          return processingPollInterval(hasProcessing);
        },
      },
    });

  const { upload, uploads, isUploading } = useDirectSourceUpload(
    {
      createSession: (file, signal) =>
        skillSourcesControllerCreateUpload(
          skill.id,
          { fileName: file.name, mimeType: file.type, fileSize: file.size },
          signal,
        ),
      complete: (uploadId, signal) =>
        skillSourcesControllerCompleteUpload(skill.id, uploadId, signal),
    },
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [`/skills/${skill.id}/sources`],
        });
        showSuccess(t('sources.addedSuccessfully'));
      },
      onError: (error) => handleSourceUploadError(error, t),
    },
  );

  const removeSourceMutation = useSkillSourcesControllerRemoveSource({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [`/skills/${skill.id}/sources`],
        });
        showSuccess(t('sources.removedSuccessfully'));
      },
      onError: () => {
        showError(t('sources.failedToRemove'));
      },
    },
  });

  function removeFileSource(sourceId: string) {
    removeSourceMutation.mutate({
      id: skill.id,
      sourceId,
    });
  }

  return {
    sources,
    isLoadingSources,
    addFileSource: ({ data }: { id: string; data: { file: File } }) =>
      upload(data.file),
    addFileSourcePending: isUploading,
    uploads,
    removeSource: removeFileSource,
    removeSourcePending: removeSourceMutation.isPending,
  };
}
