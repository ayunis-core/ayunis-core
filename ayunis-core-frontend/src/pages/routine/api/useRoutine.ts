import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getRoutinesControllerFindOneQueryKey,
  getThreadsControllerFindAllQueryKey,
  useRoutinesControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import { invalidateNotificationQueries } from '@/features/notifications';
import { routinesRefetchInterval, type Routine } from '@/features/routines';

/**
 * Polls like the routines list, and every status change refreshes the
 * routine's chats and notifications, since a run creates its routine thread
 * and may post notifications in the background.
 */
export function useRoutine(initial: Routine) {
  const queryClient = useQueryClient();
  const { data } = useRoutinesControllerFindOne(initial.id, {
    query: {
      queryKey: getRoutinesControllerFindOneQueryKey(initial.id),
      refetchInterval: (query) =>
        routinesRefetchInterval(query.state.data ? [query.state.data] : []),
    },
  });

  useEffect(() => {
    if (!data) return;
    void queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindAllQueryKey(),
    });
    invalidateNotificationQueries(queryClient);
  }, [data, queryClient]);

  return { routine: data ?? initial };
}
