const activeRuns = new Map<string, AbortController>();
const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function registerActiveThreadRun(
  threadId: string,
  controller: AbortController,
): void {
  const existingController = activeRuns.get(threadId);
  if (existingController && existingController !== controller) {
    existingController.abort();
  }
  activeRuns.set(threadId, controller);
  notifyListeners();
}

export function unregisterActiveThreadRun(
  threadId: string,
  controller: AbortController,
): void {
  if (activeRuns.get(threadId) !== controller) return;
  activeRuns.delete(threadId);
  notifyListeners();
}

export function abortActiveThreadRun(threadId: string): void {
  const controller = activeRuns.get(threadId);
  if (!controller) return;
  activeRuns.delete(threadId);
  controller.abort();
  notifyListeners();
}

export function isThreadRunActive(threadId: string): boolean {
  return activeRuns.has(threadId);
}

export function subscribeToActiveThreadRuns(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
