const activeRuns = new Map<string, AbortController>();

export function registerActiveThreadRun(
  threadId: string,
  controller: AbortController,
): void {
  activeRuns.set(threadId, controller);
}

export function unregisterActiveThreadRun(
  threadId: string,
  controller: AbortController,
): void {
  if (activeRuns.get(threadId) === controller) activeRuns.delete(threadId);
}

export function abortActiveThreadRun(threadId: string): void {
  const controller = activeRuns.get(threadId);
  if (!controller) return;
  activeRuns.delete(threadId);
  controller.abort();
}
