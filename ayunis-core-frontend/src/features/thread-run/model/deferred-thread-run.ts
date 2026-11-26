import { useCallback, useSyncExternalStore } from 'react';
import {
  clearWaitingMessage,
  clearWaitingMessages,
  takeWaitingMessage,
  writeWaitingMessage,
} from '@/shared/lib/waiting-message-storage';
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
  writeWaitingMessage(run.threadId, run.text);
  notifyListeners();
}

/**
 * The text of a message that was waiting when the page was reloaded; its
 * files may be gone, so it is handed back instead of being sent.
 */
export function takeInterruptedThreadRunText(threadId: string): string | null {
  if (deferredRuns.has(threadId)) return null;
  return takeWaitingMessage(threadId);
}

export function getDeferredThreadRun(threadId: string): ThreadRunStart | null {
  return deferredRuns.get(threadId) ?? null;
}

export function startDeferredThreadRun(threadId: string): boolean {
  const run = deferredRuns.get(threadId);
  if (!run) return false;
  deferredRuns.delete(threadId);
  clearWaitingMessage(threadId);
  startThreadRun(run);
  notifyListeners();
  return true;
}

/** Returns whether a message was waiting. */
export function cancelDeferredThreadRun(threadId: string): boolean {
  clearWaitingMessage(threadId);
  if (!deferredRuns.delete(threadId)) return false;
  notifyListeners();
  return true;
}

export function resetDeferredThreadRuns(): void {
  deferredRuns.clear();
  clearWaitingMessages();
  notifyListeners();
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
