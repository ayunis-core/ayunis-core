import { stopRun, type RunEndpoints } from '@ayunis/chat/runs';
import { threadRunEndpoints } from '@/features/chat-surface';

export function stopThreadRun(
  threadId: string,
  transport: RunEndpoints = threadRunEndpoints,
): void {
  stopRun(threadId, transport.cancel);
}
