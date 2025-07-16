import {
  getThreadsControllerFindOneQueryKey,
  useThreadsControllerUpdateAgent,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { UpdateThreadAgentDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

export function useUpdateThreadAgent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useThreadsControllerUpdateAgent({
    mutation: {
      onSettled: (_, __, { id: threadId }) => {
        queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindOneQueryKey(threadId),
        });
        router.invalidate();
      },
    },
  });

  async function updateAgent(threadId: string, agentId: string): Promise<void> {
    const data: UpdateThreadAgentDto = {
      agentId,
    };
    await mutation.mutateAsync({ id: threadId, data });
  }

  return {
    updateAgent,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
