import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getNotificationsControllerCountUnreadQueryKey,
  getRoutinesControllerFindAllQueryKey,
  getThreadsControllerFindAllQueryKey,
  useRoutinesControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import { routinesRefetchInterval } from '@/pages/routines/lib/routines-refetch-interval';

/**
 * Polls quickly while a run is queued or running and slowly otherwise, since
 * scheduled runs start in the background. Every status change also refreshes
 * the chat lists and the inbox badge, since a run creates its routine thread
 * and may post notifications in the background.
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
    void queryClient.invalidateQueries({
      queryKey: getNotificationsControllerCountUnreadQueryKey(),
    });
  }, [data, queryClient]);

  return { routines: data ?? [], isLoading, error };
}
