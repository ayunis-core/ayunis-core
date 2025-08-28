import {
  useAgentsControllerAddFileSource,
  useAgentsControllerGetAgentSources,
  useAgentsControllerRemoveSource,
  type AgentResponseDto,
} from "@/shared/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function useAgentSources({
  agent,
}: {
  agent: AgentResponseDto;
}) {
  const queryClient = useQueryClient();

  // Fetch existing sources
  const { data: sources = [], isLoading: isLoadingSources } =
    useAgentsControllerGetAgentSources(agent.id);

  // Add file source mutation
  const addFileSourceMutation = useAgentsControllerAddFileSource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [`/agents/${agent.id}/sources`],
        });
        toast.success("Source added successfully");
      },
      onError: () => {
        toast.error("Failed to add source");
      },
    },
  });

  // Remove source mutation
  const removeSourceMutation = useAgentsControllerRemoveSource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [`/agents/${agent.id}/sources`],
        });
        toast.success("Source removed successfully");
      },
      onError: () => {
        toast.error("Failed to remove source");
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
