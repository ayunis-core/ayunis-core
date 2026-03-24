import {
  useSkillSourcesControllerAddFileSource,
  useSkillSourcesControllerGetSkillSources,
  useSkillSourcesControllerRemoveSource,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { SkillSourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

const PROCESSING_POLL_INTERVAL = 5000;

export default function useSkillSources({
  skill,
}: {
  skill: SkillResponseDto;
}) {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();

  const { data: sources = [], isLoading: isLoadingSources } =
    useSkillSourcesControllerGetSkillSources(skill.id, {
      query: {
        staleTime: 0,
        // eslint-disable-next-line sonarjs/function-return-type -- React Query's refetchInterval expects number | false
        refetchInterval: (query) => {
          const data = query.state.data ?? [];
          const hasProcessing = data.some(
            (s) => s.status === SkillSourceResponseDtoStatus.processing,
          );
          return hasProcessing ? PROCESSING_POLL_INTERVAL : false;
        },
      },
    });

  const addFileSourceMutation = useSkillSourcesControllerAddFileSource({
    mutation: {
      retry: 0,
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [`/skills/${skill.id}/sources`],
        });
        showSuccess(t('sources.addedSuccessfully'));
      },
      onError: (error: unknown) => {
        handleSourceUploadError(error, t);
      },
    },
  });

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
    addFileSource: addFileSourceMutation.mutate,
    addFileSourcePending: addFileSourceMutation.isPending,
    removeSource: removeFileSource,
    removeSourcePending: removeSourceMutation.isPending,
  };
}
