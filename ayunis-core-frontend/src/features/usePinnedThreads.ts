import { useSyncExternalStore } from 'react';

let pinnedThreadIds: string[] = [];
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePinnedThreadIds(): string[] {
  return useSyncExternalStore(subscribe, () => pinnedThreadIds);
}

export function toggleThreadPinned(threadId: string) {
  pinnedThreadIds = pinnedThreadIds.includes(threadId)
    ? pinnedThreadIds.filter((id) => id !== threadId)
    : [...pinnedThreadIds, threadId];
  listeners.forEach((listener) => listener());
}
