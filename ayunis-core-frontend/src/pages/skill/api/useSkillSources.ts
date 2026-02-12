import {
  useSkillsControllerAddFileSource,
  useSkillsControllerGetSkillSources,
  useSkillsControllerRemoveSource,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

export default function useSkillSources({
  skill,
}: {
  skill: SkillResponseDto;
}) {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();

  const { data: sources = [], isLoading: isLoadingSources } =
    useSkillsControllerGetSkillSources(skill.id);

  const addFileSourceMutation = useSkillsControllerAddFileSource({
    mutation: {
      retry: 0,
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [`/skills/${skill.id}/sources`],
        });
        showSuccess(t('sources.addedSuccessfully'));
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'INVALID_FILE_TYPE':
            case 'UNSUPPORTED_FILE_TYPE':
              showError(t('sources.invalidFileTypeError'));
              break;
            case 'EMPTY_FILE_DATA':
              showError(t('sources.fileSourceEmptyDataError'));
              break;
            case 'FILE_TOO_LARGE':
              showError(t('sources.fileSourceTooLargeError'));
              break;
            case 'TOO_MANY_PAGES':
              showError(t('sources.fileSourceTooManyPagesError'));
              break;
            case 'SERVICE_BUSY':
              showError(t('sources.fileSourceServiceBusyError'));
              break;
            case 'SERVICE_TIMEOUT':
              showError(t('sources.fileSourceTimeoutError'));
              break;
            default:
              showError(t('sources.failedToAdd'));
          }
        } catch {
          showError(t('sources.failedToAdd'));
        }
      },
    },
  });

  const removeSourceMutation = useSkillsControllerRemoveSource({
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
