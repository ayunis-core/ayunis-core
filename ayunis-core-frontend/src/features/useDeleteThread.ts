import { useThreadsControllerDelete } from "@/shared/api";
import { useQueryClient } from "@tanstack/react-query";

interface UseDeleteChatParams {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDeleteThread(params: UseDeleteChatParams) {
  const queryClient = useQueryClient();
  const { mutate } = useThreadsControllerDelete({
    mutation: {
      onSuccess: params.onSuccess,
      onError: params.onError,
    },
  });

  function deleteChat(threadId: string) {
    mutate(
      { id: threadId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["threads"] });
        },
      },
    );
  }

  return { deleteChat };
}
