import { createChatRunLifecycle } from '@ayunis/chat/runs';
import { threadRunEndpoints } from '@/features/chat-surface';
import {
  clearWaitingMessage,
  clearWaitingMessages,
  takeWaitingMessage,
  writeWaitingMessage,
} from '@/shared/lib/waiting-message-storage';

export const threadRunLifecycle = createChatRunLifecycle(threadRunEndpoints, {
  waitingMessages: {
    write: writeWaitingMessage,
    clear: clearWaitingMessage,
    take: takeWaitingMessage,
    clearAll: clearWaitingMessages,
  },
});

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
