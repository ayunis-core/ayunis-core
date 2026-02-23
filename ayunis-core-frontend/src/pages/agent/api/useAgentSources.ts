import {
  useAgentsControllerAddFileSource,
  useAgentsControllerGetAgentSources,
  useAgentsControllerRemoveSource,
  type AgentResponseDto,
} from '@/shared/api';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
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
        handleSourceUploadError(error, t);
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
