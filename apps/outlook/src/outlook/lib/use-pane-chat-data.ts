import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getActiveRunsControllerFindActiveQueryKey,
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  threadsControllerDelete,
  threadsControllerUpdateTitle,
  useThreadsControllerFindAll,
} from '@ayunis/api-client/endpoints';
import { SessionClient, ThreadType } from '@ayunis/api-client/schemas';

export const PANE_HISTORY_PAGE_SIZE = 20;

export function usePaneHistory(offset: number) {
  return useThreadsControllerFindAll({
    client: SessionClient.outlook,
    type: ThreadType.chat,
    limit: PANE_HISTORY_PAGE_SIZE,
    offset,
  });
}

export function usePaneThreadActions() {
  const queryClient = useQueryClient();
  const refreshThread = useCallback(
    (id: string) =>
      queryClient.invalidateQueries({
        queryKey: getThreadsControllerFindOneQueryKey(id),
      }),
    [queryClient],
  );
  const refreshHistory = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindAllQueryKey(),
    });
  }, [queryClient]);
  const refreshRun = useCallback(
    (id: string) => {
      void refreshThread(id);
      refreshHistory();
      void queryClient.invalidateQueries({
        queryKey: getActiveRunsControllerFindActiveQueryKey(),
      });
    },
    [queryClient, refreshHistory, refreshThread],
  );

  return {
    refreshThread,
    refreshRun,
    async rename(id: string, title: string, signal: AbortSignal) {
      await threadsControllerUpdateTitle(id, { title }, signal);
      await refreshThread(id);
      refreshHistory();
    },
    async remove(id: string, signal: AbortSignal) {
      await threadsControllerDelete(id, signal);
      queryClient.removeQueries({
        queryKey: getThreadsControllerFindOneQueryKey(id),
        exact: true,
      });
      refreshHistory();
    },
  };
}
