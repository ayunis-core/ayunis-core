import {
  cancelStartedRun,
  startRun,
  type ThreadRunStart,
} from '@ayunis/chat/runs';
import { threadRunEndpoints } from '@/features/thread-run/api/thread-run-endpoints';
import { stopThreadRun } from '@/features/thread-run/api/stopThreadRun';

export {
  takeStartedThreadRun,
  type StartedRunRequest,
  type StartedThreadRun,
  type ThreadRunStart,
} from '@ayunis/chat/runs';

export function startThreadRun(run: ThreadRunStart): void {
  startRun(run, threadRunEndpoints.send);
}

export function cancelStartedThreadRun(threadId: string): void {
  cancelStartedRun(threadId, stopThreadRun);
}
