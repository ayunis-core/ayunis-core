import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getSkillSourcesControllerGetSkillSourcesQueryKey,
  useSkillSourcesControllerAddFileSource,
  useSkillSourcesControllerGetSkillSources,
  useSkillSourcesControllerRemoveSource,
} from '@/shared/api/generated/ayunisCoreAPI';
import { SkillSourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { showError, showSuccess } from '@/shared/lib/toast';

const PROCESSING_POLL_INTERVAL = 5000;

export function useWorkspaceSkillSources({ skillId }: { skillId: string }) {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();
  const queryKey = getSkillSourcesControllerGetSkillSourcesQueryKey(skillId);

  const { data: sources = [], isLoading: isLoadingSources } =
    useSkillSourcesControllerGetSkillSources(skillId, {
      query: {
        staleTime: 0,
        refetchInterval: (query) =>
          (query.state.data ?? []).some(
            (source) =>
              source.status === SkillSourceResponseDtoStatus.processing,
          )
            ? PROCESSING_POLL_INTERVAL
            : false,
      },
    });

  const addMutation = useSkillSourcesControllerAddFileSource({
    mutation: {
      retry: 0,
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey });
        showSuccess(t('sources.addedSuccessfully'));
      },
      onError: (error: unknown) => handleSourceUploadError(error, t),
    },
  });

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
      addMutation.mutate({ id: skillId, data }),
    addFileSourcePending: addMutation.isPending,
    removeSource: (sourceId: string) =>
      removeMutation.mutate({ id: skillId, sourceId }),
    removeSourcePending: removeMutation.isPending,
  };
}
