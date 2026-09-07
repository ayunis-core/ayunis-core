import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getWorkspaceSkillSourcesControllerListQueryKey,
  useWorkspaceSkillSourcesControllerAddFile,
  useWorkspaceSkillSourcesControllerList,
  useWorkspaceSkillSourcesControllerRemove,
} from '@/shared/api/generated/ayunisCoreAPI';
import { SkillSourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { showError, showSuccess } from '@/shared/lib/toast';

const PROCESSING_POLL_INTERVAL = 5000;

export function useWorkspaceSkillSources({
  workspaceId,
  skillId,
}: {
  workspaceId: string;
  skillId: string;
}) {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();
  const queryKey = getWorkspaceSkillSourcesControllerListQueryKey(
    workspaceId,
    skillId,
  );

  const { data: sources = [], isLoading: isLoadingSources } =
    useWorkspaceSkillSourcesControllerList(workspaceId, skillId, {
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

  const addMutation = useWorkspaceSkillSourcesControllerAddFile({
    mutation: {
      retry: 0,
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey });
        showSuccess(t('sources.addedSuccessfully'));
      },
      onError: (error: unknown) => handleSourceUploadError(error, t),
    },
  });

  const removeMutation = useWorkspaceSkillSourcesControllerRemove({
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
      addMutation.mutate({ id: workspaceId, skillId, data }),
    addFileSourcePending: addMutation.isPending,
    removeSource: (sourceId: string) =>
      removeMutation.mutate({ id: workspaceId, skillId, sourceId }),
    removeSourcePending: removeMutation.isPending,
  };
}
