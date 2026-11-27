export interface ThreadSubmission {
  readonly text: string;
  readonly images?: readonly File[];
}

/**
 * The message a chat is sending, shown before the run confirms it, and the
 * one that failed and goes back into the composer. Kept per lifecycle, so a
 * submission survives switching chats while its run continues.
 */
export function createThreadSubmissions() {
  const pending = new Map<string, string>();
  const active = new Map<string, ThreadSubmission>();
  const failed = new Map<string, ThreadSubmission>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  return {
    ...readSubmissions(pending, failed, notify),
    startSubmission(
      this: void,
      threadId: string,
      submission: ThreadSubmission,
    ): void {
      active.set(threadId, submission);
      failed.delete(threadId);
      pending.set(threadId, submission.text);
      notify();
    },
    clearPendingSubmission(this: void, threadId: string): void {
      if (pending.delete(threadId)) notify();
    },
    completeSubmission(this: void, threadId: string, didFail: boolean): void {
      const submission = active.get(threadId);
      if (didFail && submission) failed.set(threadId, submission);
      active.delete(threadId);
      pending.delete(threadId);
      notify();
    },
    resetSubmission(this: void, threadId: string): void {
      active.delete(threadId);
      failed.delete(threadId);
      pending.delete(threadId);
      notify();
    },
    subscribeToSubmissions(this: void, listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clearSubmissions(this: void): void {
      active.clear();
      failed.clear();
      pending.clear();
      notify();
    },
  };
}

function readSubmissions(
  pending: ReadonlyMap<string, string>,
  failed: Map<string, ThreadSubmission>,
  notify: () => void,
) {
  return {
    getPendingSubmission: (threadId: string): string | null =>
      pending.get(threadId) ?? null,
    getFailedSubmission: (threadId: string): ThreadSubmission | null =>
      failed.get(threadId) ?? null,
    consumeFailedSubmission(
      this: void,
      threadId: string,
    ): ThreadSubmission | null {
      const submission = failed.get(threadId) ?? null;
      if (!submission) return null;
      failed.delete(threadId);
      notify();
      return submission;
    },
  };
}
