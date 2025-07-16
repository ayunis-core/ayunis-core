import {
  getThreadsControllerFindOneQueryKey,
  useThreadsControllerUpdateModel,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { UpdateThreadModelDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

export function useUpdateThreadModel() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useThreadsControllerUpdateModel({
    mutation: {
      onSettled: (_, __, { id: threadId }) => {
        queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindOneQueryKey(threadId),
        });
        router.invalidate();
      },
    },
  });

  async function updateModel(threadId: string, modelId: string): Promise<void> {
    const data: UpdateThreadModelDto = {
      modelId,
    };
    await mutation.mutateAsync({ id: threadId, data });
  }

  return {
    updateModel,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
