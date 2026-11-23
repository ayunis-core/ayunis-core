import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  getFavoritesControllerFindAllQueryKey,
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  threadsControllerUpdateTitle,
} from '@ayunis/api-client';

interface RenameThreadParams {
  threadId: string;
  title: string;
}

interface UseRenameThreadParams {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

async function renameThread({ threadId, title }: RenameThreadParams) {
  await threadsControllerUpdateTitle(threadId, { title });
}

export function useRenameThread(params: UseRenameThreadParams = {}) {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: renameThread,
    onError: params.onError,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindOneQueryKey(variables.threadId),
      });
      void queryClient.invalidateQueries({
        queryKey: getFavoritesControllerFindAllQueryKey(),
      });
      params.onSuccess?.();
    },
  });

  function rename(threadId: string, title: string) {
    mutate({ threadId, title });
  }

  return { rename, isRenaming: isPending };
}
