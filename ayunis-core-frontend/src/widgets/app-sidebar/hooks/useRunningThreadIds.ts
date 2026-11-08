import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useActiveThreadRuns,
  useLocalActiveThreadRunIds,
} from '@/features/thread-run';
import { getThreadsControllerFindAllQueryKey } from '@/shared/api/generated/ayunisCoreAPI';

/**
 * The threads with a run in progress: the ones this tab is streaming, shown
 * at once, plus the ones the server lists. Runs start and end outside this
 * tab (routine executions, other tabs), so a change refreshes the chat list:
 * a routine's new thread appears, and a finished run's title shows.
 */
export function useRunningThreadIds(): ReadonlySet<string> {
  const queryClient = useQueryClient();
  const { runsByThreadId } = useActiveThreadRuns();
  const localIds = useLocalActiveThreadRunIds();
  const runningIds = useMemo(
    () => new Set([...runsByThreadId.keys(), ...localIds]),
    [runsByThreadId, localIds],
  );
  const runningKey = [...runningIds]
    .sort((a, b) => a.localeCompare(b))
    .join(',');
  const previousKeyRef = useRef(runningKey);

  useEffect(() => {
    if (previousKeyRef.current === runningKey) return;
    previousKeyRef.current = runningKey;
    void queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindAllQueryKey(),
    });
  }, [runningKey, queryClient]);

  return runningIds;
}
