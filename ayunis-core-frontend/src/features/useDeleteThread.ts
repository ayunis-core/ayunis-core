import {
  useThreadsControllerDelete,
  getThreadsControllerFindAllQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';

interface UseDeleteChatParams {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDeleteThread(params: UseDeleteChatParams) {
  const queryClient = useQueryClient();
  const { mutate } = useThreadsControllerDelete({
    mutation: {
      onError: params.onError,
    },
  });

  function deleteChat(threadId: string) {
    mutate(
      { id: threadId },
      {
        onSuccess: () => {
          // Invalidate queries first to update the cache
          void queryClient.invalidateQueries({
            queryKey: getThreadsControllerFindAllQueryKey(),
          });
          // Then call the user's onSuccess callback
          params.onSuccess?.();
        },
      },
    );
  }

  return { deleteChat };
}
