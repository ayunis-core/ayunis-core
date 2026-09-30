import { useCallback, useSyncExternalStore } from 'react';
import {
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
