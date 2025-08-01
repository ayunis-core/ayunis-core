import {
  getThreadsControllerFindOneQueryKey,
  useThreadsControllerUpdateAgent,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { UpdateThreadAgentDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import { showError } from "@/shared/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export function useUpdateThreadAgent({ threadId }: { threadId: string }) {
  const { t } = useTranslation("chat");
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useThreadsControllerUpdateAgent({
    mutation: {
      onError: () => {
        showError(t("chat.errorUpdateAgent"));
      },
      onSettled: (_, __, { id: threadId }) => {
        queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindOneQueryKey(threadId),
        });
        router.invalidate();
      },
    },
  });

  async function updateAgent(agentId: string): Promise<void> {
    const data: UpdateThreadAgentDto = {
      agentId,
    };
    mutation.mutate({ id: threadId, data });
  }

  return {
    updateAgent,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
