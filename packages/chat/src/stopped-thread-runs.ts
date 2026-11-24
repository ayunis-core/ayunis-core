export function createStoppedThreadRuns() {
  const stoppedThreadIds = new Map<string, symbol>();

  /**
   * Threads whose run the user stopped while the server may still list it.
   * Kept outside the chat page so leaving and reopening the chat cannot replay
   * the cancelled run from a stale active-runs list.
   */
  function markThreadRunStopped(threadId: string): symbol {
    const stop = Symbol();
    stoppedThreadIds.set(threadId, stop);
    return stop;
  }

  function unmarkThreadRunStopped(threadId: string, stop?: symbol): void {
    if (stop === undefined || stoppedThreadIds.get(threadId) === stop) {
      stoppedThreadIds.delete(threadId);
    }
  }

  function isThreadRunStopped(threadId: string): boolean {
    return stoppedThreadIds.has(threadId);
  }

  /** Forgets stopped runs the server no longer lists. */
  function forgetStoppedThreadRunsExcept(
    listedThreadIds: ReadonlySet<string>,
  ): void {
    for (const threadId of stoppedThreadIds.keys()) {
      if (!listedThreadIds.has(threadId)) stoppedThreadIds.delete(threadId);
    }
  }

  function clearStoppedThreadRuns(): void {
    stoppedThreadIds.clear();
  }

  return {
    markThreadRunStopped,
    unmarkThreadRunStopped,
    isThreadRunStopped,
    forgetStoppedThreadRunsExcept,
    clearStoppedThreadRuns,
  };
}
