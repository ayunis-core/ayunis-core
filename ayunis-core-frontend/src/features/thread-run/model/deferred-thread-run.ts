import { useCallback, useSyncExternalStore } from 'react';
import { startThreadRun, type ThreadRunStart } from './started-thread-run';

const deferredRuns = new Map<string, ThreadRunStart>();
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Holds a new chat's first message while its files are still being
 * processed. The chat page sends it once no file is processing, so the
 * answer can use them; nothing bounds how long that takes.
 */
export function deferThreadRun(run: ThreadRunStart): void {
  deferredRuns.set(run.threadId, run);
  notifyListeners();
}

export function getDeferredThreadRun(threadId: string): ThreadRunStart | null {
  return deferredRuns.get(threadId) ?? null;
}

export function startDeferredThreadRun(threadId: string): number | undefined {
  const run = deferredRuns.get(threadId);
  if (!run) return;
  deferredRuns.delete(threadId);
  startThreadRun(run);
  notifyListeners();
  return run.messageCountBeforeSend;
}

/** Returns whether a message was waiting. */
export function cancelDeferredThreadRun(threadId: string): boolean {
  if (!deferredRuns.delete(threadId)) return false;
  notifyListeners();
  return true;
}

function subscribeToDeferredThreadRuns(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useIsThreadRunDeferred(threadId: string): boolean {
  const getSnapshot = useCallback(() => deferredRuns.has(threadId), [threadId]);
  return useSyncExternalStore(
    subscribeToDeferredThreadRuns,
    getSnapshot,
    () => false,
  );
}
