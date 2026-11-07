import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getRoutinesControllerFindAllQueryKey,
  getThreadsControllerFindAllQueryKey,
  useRoutinesControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import { routinesRefetchInterval } from '@/pages/routines/lib/routines-refetch-interval';

/**
 * Polls quickly while a run is queued or running and slowly otherwise, since
 * scheduled runs start in the background. Every status change also refreshes
 * the chat lists, since a run creates its routine thread in the background.
 */
export function useRoutines() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useRoutinesControllerFindAll({
    query: {
      queryKey: getRoutinesControllerFindAllQueryKey(),
      refetchInterval: (query) => routinesRefetchInterval(query.state.data),
    },
  });

  useEffect(() => {
    if (!data) return;
    void queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindAllQueryKey(),
    });
  }, [data, queryClient]);

  return { routines: data ?? [], isLoading, error };
}
