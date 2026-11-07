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
 * Polls like the routines list, and every poll refreshes the routine's chats
 * and notifications: a running run posts notifications without the routine
 * itself changing.
 */
export function useRoutine(initial: Routine) {
  const queryClient = useQueryClient();
  const { data, dataUpdatedAt } = useRoutinesControllerFindOne(initial.id, {
    query: {
      queryKey: getRoutinesControllerFindOneQueryKey(initial.id),
      refetchInterval: (query) =>
        routinesRefetchInterval(query.state.data ? [query.state.data] : []),
    },
  });

  useEffect(() => {
    if (!dataUpdatedAt) return;
    void queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindAllQueryKey(),
    });
    invalidateNotificationQueries(queryClient);
  }, [dataUpdatedAt, queryClient]);

  return { routine: data ?? initial };
}
