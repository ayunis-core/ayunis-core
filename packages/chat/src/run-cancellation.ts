import { abortActiveThreadRun } from './active-thread-run';
import type { RunEndpoints } from './run-endpoints';
import {
  markThreadRunStopped,
  unmarkThreadRunStopped,
} from './stopped-thread-runs';

export function stopRun(
  threadId: string,
  cancel?: RunEndpoints['cancel'],
): void {
  if (cancel) {
    markThreadRunStopped(threadId);
    cancel(threadId).catch((error: unknown) => {
      console.error('Failed to cancel run', error);
      unmarkThreadRunStopped(threadId);
    });
  }
  abortActiveThreadRun(threadId);
}
