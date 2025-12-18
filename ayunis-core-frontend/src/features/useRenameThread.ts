import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  axiosInstance,
} from '@/shared/api';

interface RenameThreadParams {
  threadId: string;
  title: string;
}

interface UseRenameThreadParams {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

async function renameThread({ threadId, title }: RenameThreadParams) {
  await axiosInstance.patch(`/threads/${threadId}/title`, { title });
}

export function useRenameThread(params: UseRenameThreadParams = {}) {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: renameThread,
    onError: params.onError,
    onSuccess: (_data, variables) => {
      // Invalidate queries to update the cache
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindOneQueryKey(variables.threadId),
      });
      // Then call the user's onSuccess callback
      params.onSuccess?.();
    },
  });

  function rename(threadId: string, title: string) {
    mutate({ threadId, title });
  }

  return { rename, isRenaming: isPending };
}
