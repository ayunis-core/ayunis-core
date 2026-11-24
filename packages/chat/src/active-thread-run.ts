export function createActiveThreadRuns() {
  const activeRuns = new Map<string, AbortController>();
  const listeners = new Set<() => void>();
  let activeThreadIds: ReadonlySet<string> = new Set();

  function notifyListeners(): void {
    activeThreadIds = new Set(activeRuns.keys());
    listeners.forEach((listener) => listener());
  }

  function registerActiveThreadRun(
    threadId: string,
    controller: AbortController,
  ): void {
    const previous = activeRuns.get(threadId);
    if (previous && previous !== controller) previous.abort();
    activeRuns.set(threadId, controller);
    notifyListeners();
  }

  return {
    registerActiveThreadRun,
    unregisterActiveThreadRun(
      this: void,
      threadId: string,
      controller: AbortController,
    ): void {
      if (activeRuns.get(threadId) !== controller) return;
      activeRuns.delete(threadId);
      notifyListeners();
    },
    abortActiveThreadRun(this: void, threadId: string): void {
      const controller = activeRuns.get(threadId);
      if (!controller) return;
      activeRuns.delete(threadId);
      controller.abort();
      notifyListeners();
    },
    isThreadRunActive: (threadId: string) => activeRuns.has(threadId),
    // A stable snapshot for useSyncExternalStore.
    getActiveThreadRunIds: () => activeThreadIds,
    subscribeToActiveThreadRuns(this: void, listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    abortAllThreadRuns(): void {
      const controllers = [...activeRuns.values()];
      activeRuns.clear();
      controllers.forEach((controller) => controller.abort());
      notifyListeners();
    },
  };
}
