import { createChatRunLifecycle } from '@ayunis/chat/runs';
import { threadRunEndpoints } from '@/features/chat-surface';

export const threadRunLifecycle = createChatRunLifecycle(threadRunEndpoints);

export const {
  abortActiveThreadRun,
  forgetStoppedThreadRunsExcept,
  getActiveThreadRunIds,
  isThreadRunActive,
  isThreadRunStopped,
  markThreadRunStopped,
  registerActiveThreadRun,
  subscribeToActiveThreadRuns,
  unmarkThreadRunStopped,
  unregisterActiveThreadRun,
} = threadRunLifecycle;
