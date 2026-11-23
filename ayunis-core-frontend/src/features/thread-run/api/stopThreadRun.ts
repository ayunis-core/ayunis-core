import { stopRun } from '@ayunis/chat/runs';
import { threadRunEndpoints } from './thread-run-endpoints';

export function stopThreadRun(threadId: string): void {
  stopRun(threadId, threadRunEndpoints.cancel);
}
