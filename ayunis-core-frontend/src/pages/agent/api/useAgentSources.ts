import {
  useAgentsControllerAddFileSource,
  useAgentsControllerGetAgentSources,
  useAgentsControllerRemoveSource,
  type AgentResponseDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

export default function useAgentSources({
  agent,
}: {
  agent: AgentResponseDto;
}) {
  const { t } = useTranslation('agent');
  const queryClient = useQueryClient();

  // Fetch existing sources
  const { data: sources = [], isLoading: isLoadingSources } =
    useAgentsControllerGetAgentSources(agent.id);

  // Add file source mutation
  const addFileSourceMutation = useAgentsControllerAddFileSource({
    mutation: {
      retry: 0,
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [`/agents/${agent.id}/sources`],
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

  // Remove source mutation
  const removeSourceMutation = useAgentsControllerRemoveSource({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [`/agents/${agent.id}/sources`],
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
      id: agent.id,
      sourceAssignmentId: sourceId,
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
