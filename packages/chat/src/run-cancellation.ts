import type { RunEndpoints } from './run-endpoints';

export function stopRun(
  threadId: string,
  cancel: RunEndpoints['cancel'],
  activity: {
    markThreadRunStopped: (threadId: string) => symbol;
    unmarkThreadRunStopped: (threadId: string, stop: symbol) => void;
    abortActiveThreadRun: (threadId: string) => void;
  },
): void {
  if (cancel) {
    const stop = activity.markThreadRunStopped(threadId);
    cancel(threadId).catch((error: unknown) => {
      console.error('Failed to cancel run', error);
      activity.unmarkThreadRunStopped(threadId, stop);
    });
  }
  activity.abortActiveThreadRun(threadId);
}
