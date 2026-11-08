import { useCallback, useSyncExternalStore } from 'react';
import {
  getActiveThreadRunIds,
  isThreadRunActive,
  subscribeToActiveThreadRuns,
} from './active-thread-run';

export function useIsThreadRunActive(threadId: string): boolean {
  const getSnapshot = useCallback(
    () => isThreadRunActive(threadId),
    [threadId],
  );
  return useSyncExternalStore(
    subscribeToActiveThreadRuns,
    getSnapshot,
    () => false,
  );
}

const NO_THREAD_IDS: ReadonlySet<string> = new Set();

/** The threads this tab is streaming a run for right now. */
export function useLocalActiveThreadRunIds(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribeToActiveThreadRuns,
    getActiveThreadRunIds,
    () => NO_THREAD_IDS,
  );
}
