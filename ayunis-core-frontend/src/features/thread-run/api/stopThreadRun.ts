import { activeRunsControllerCancel } from '@/shared/api/generated/ayunisCoreAPI';
import { abortActiveThreadRun } from '@/features/thread-run/model/active-thread-run';
import {
  markThreadRunStopped,
  unmarkThreadRunStopped,
} from '@/features/thread-run/model/stopped-thread-runs';

/**
 * Runs continue on the server when the browser stops listening, so stopping
 * one cancels it there and then drops the local stream. If the server could
 * not cancel it, the run keeps going and the chat follows it again.
 */
export function stopThreadRun(threadId: string): void {
  markThreadRunStopped(threadId);
  activeRunsControllerCancel(threadId).catch((error: unknown) => {
    console.error('Failed to cancel run', error);
    unmarkThreadRunStopped(threadId);
  });
  abortActiveThreadRun(threadId);
}
