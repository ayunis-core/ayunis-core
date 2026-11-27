import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getActiveRunsControllerFindActiveQueryKey,
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
} from '@ayunis/api-client/endpoints';

/** Refreshes the chat, the history and the runs once a run settled. */
export function usePaneThreadActions() {
  const queryClient = useQueryClient();
  const refreshRun = useCallback(
    (id: string) => {
      for (const queryKey of [
        getThreadsControllerFindOneQueryKey(id),
        getThreadsControllerFindAllQueryKey(),
        getActiveRunsControllerFindActiveQueryKey(),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    [queryClient],
  );
  return { refreshRun };
}
