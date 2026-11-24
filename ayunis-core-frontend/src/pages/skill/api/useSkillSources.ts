import {
  skillSourcesControllerCompleteUpload,
  skillSourcesControllerCreateUpload,
  useSkillSourcesControllerGetSkillSources,
  useSkillSourcesControllerRemoveSource,
} from '@ayunis/api-client/endpoints';
import type { SkillResponseDto } from '@ayunis/api-client/schemas';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { useDirectSourceUpload } from '@/shared/lib/source-upload';
import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import {
  isSourcePending,
  useProcessingPollInterval,
} from '@/shared/lib/processing-poll';

export default function useSkillSources({
  skill,
}: {
  skill: SkillResponseDto;
}) {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();
  const processingPollInterval = useProcessingPollInterval(skill.id);

  const { data: sources = [], isLoading: isLoadingSources } =
    useSkillSourcesControllerGetSkillSources(skill.id, {
      query: {
        staleTime: 0,
        refetchInterval: (query) => {
          const data = query.state.data ?? [];
          return processingPollInterval(data.some(isSourcePending));
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
        showSuccess(t('sources.addedSuccessfully'));
        await queryClient.invalidateQueries({
          queryKey: [`/skills/${skill.id}/sources`],
        });
      },
      onError: (error) => handleSourceUploadError(error, t),
    },
    { scope: skill.id },
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
