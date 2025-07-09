import { useThreadsControllerUpdateAgent } from "@/shared/api/generated/ayunisCoreAPI";
import type { UpdateThreadAgentDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";

export function useUpdateThreadAgent() {
  const mutation = useThreadsControllerUpdateAgent();

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
