import {
  useThreadsControllerDelete,
  getThreadsControllerFindAllQueryKey,
  getFavoritesControllerFindAllQueryKey,
} from '@/shared/api';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { abortActiveThreadRun } from '@/features/thread-run/model/active-thread-run';
import { clearChatDraft } from '@/shared/lib/chat-draft-storage';

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
          clearChatDraft(threadId);
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
