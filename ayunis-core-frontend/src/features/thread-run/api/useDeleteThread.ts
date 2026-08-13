import {
  useThreadsControllerDelete,
  getThreadsControllerFindAllQueryKey,
  getFavoritesControllerFindAllQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { abortActiveThreadRun } from '../model/active-thread-run';

interface UseDeleteChatParams {
  onBeforeDelete?: () => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDeleteThread(params: UseDeleteChatParams) {
  const queryClient = useQueryClient();
  const router = useRouter();
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
          void queryClient.invalidateQueries({
            queryKey: getThreadsControllerFindAllQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getFavoritesControllerFindAllQueryKey(),
          });
          void router.invalidate();
          params.onSuccess?.();
        },
      },
    );
  }

  return { deleteChat };
}
