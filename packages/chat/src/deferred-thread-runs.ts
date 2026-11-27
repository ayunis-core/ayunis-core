import type { ThreadRunStart } from './started-thread-run';

/**
 * Keeps the text of a message that waits for its files beyond a reload of
 * the surface, keyed by chat. The host scopes it to the signed-in principal.
 */
export interface WaitingMessageStorage {
  readonly write: (threadId: string, text: string) => void;
  readonly clear: (threadId: string) => void;
  readonly take: (threadId: string) => string | null;
  readonly clearAll: () => void;
}

/**
 * Holds a message while the chat's files are still being processed. The
 * conversation sends it once no file is processing, so the answer can use
 * them; nothing bounds how long that takes.
 */
export function createDeferredThreadRuns(
  startRun: (run: ThreadRunStart) => void,
  storage?: WaitingMessageStorage,
) {
  const deferred = new Map<string, ThreadRunStart>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  return {
    deferThreadRun(this: void, run: ThreadRunStart): void {
      deferred.set(run.threadId, run);
      if (run.text) storage?.write(run.threadId, run.text);
      else storage?.clear(run.threadId);
      notify();
    },
    /**
     * The text of a message that was waiting when the surface was reloaded;
     * its files may be gone, so it is handed back instead of being sent.
     */
    takeInterruptedThreadRunText(this: void, threadId: string): string | null {
      if (deferred.has(threadId)) return null;
      return storage?.take(threadId) ?? null;
    },
    getDeferredThreadRun: (threadId: string): ThreadRunStart | null =>
      deferred.get(threadId) ?? null,
    isThreadRunDeferred: (threadId: string): boolean => deferred.has(threadId),
    startDeferredThreadRun(this: void, threadId: string): boolean {
      const run = deferred.get(threadId);
      if (!run) return false;
      deferred.delete(threadId);
      storage?.clear(threadId);
      startRun(run);
      notify();
      return true;
    },
    /** Returns whether a message was waiting. */
    cancelDeferredThreadRun(this: void, threadId: string): boolean {
      storage?.clear(threadId);
      if (!deferred.delete(threadId)) return false;
      notify();
      return true;
    },
    subscribeToDeferredThreadRuns(this: void, listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clearDeferredThreadRuns(this: void): void {
      deferred.clear();
      storage?.clearAll();
      notify();
    },
  };
}
