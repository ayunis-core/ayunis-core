import {
  useAgentsControllerAddFileSource,
  useAgentsControllerGetAgentSources,
  useAgentsControllerRemoveSource,
  type AgentResponseDto,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [`/agents/${agent.id}/sources`],
        });
        toast.success(t('sources.addedSuccessfully'));
      },
      onError: () => {
        toast.error('Failed to add source');
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
        toast.success(t('sources.removedSuccessfully'));
      },
      onError: () => {
        toast.error(t('sources.failedToRemove'));
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
