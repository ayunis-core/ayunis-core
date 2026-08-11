import {
  useThreadsControllerDelete,
  getThreadsControllerFindAllQueryKey,
  getFavoritesControllerFindAllQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { abortActiveThreadRun } from '../model/active-thread-run';

interface UseDeleteChatParams {
  onBeforeDelete?: () => void;
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
    params.onBeforeDelete?.();
    abortActiveThreadRun(threadId);
    mutate(
      { id: threadId },
      {
        onSuccess: () => {
          // Invalidate queries first to update the cache
          void queryClient.invalidateQueries({
            queryKey: getThreadsControllerFindAllQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getFavoritesControllerFindAllQueryKey(),
          });
          // Then call the user's onSuccess callback
          params.onSuccess?.();
        },
      },
    );
  }

  return { deleteChat };
}
