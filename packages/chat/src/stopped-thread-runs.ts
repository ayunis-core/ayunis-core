const stoppedThreadIds = new Set<string>();

/**
 * Threads whose run the user stopped while the server may still list it.
 * Kept outside the chat page so leaving and reopening the chat cannot replay
 * the cancelled run from a stale active-runs list.
 */
export function markThreadRunStopped(threadId: string): void {
  stoppedThreadIds.add(threadId);
}

export function unmarkThreadRunStopped(threadId: string): void {
  stoppedThreadIds.delete(threadId);
}

export function isThreadRunStopped(threadId: string): boolean {
  return stoppedThreadIds.has(threadId);
}

/** Forgets stopped runs the server no longer lists. */
export function forgetStoppedThreadRunsExcept(
  listedThreadIds: ReadonlySet<string>,
): void {
  for (const threadId of stoppedThreadIds) {
    if (!listedThreadIds.has(threadId)) stoppedThreadIds.delete(threadId);
  }
}
