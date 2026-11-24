import type { QueryClient } from '@tanstack/react-query';
import { getActiveRunsControllerFindActiveQueryKey } from '@ayunis/api-client/endpoints';
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

let principal: string | undefined;

export function resetThreadRunSession(queryClient: QueryClient): void {
  principal = undefined;
  threadRunLifecycle.reset();
  queryClient.removeQueries({
    queryKey: getActiveRunsControllerFindActiveQueryKey(),
    exact: true,
  });
}

export function setThreadRunPrincipal(
  userId: string,
  orgId: string,
  queryClient: QueryClient,
): void {
  const nextPrincipal = JSON.stringify([userId, orgId]);
  if (principal !== undefined && principal !== nextPrincipal) {
    resetThreadRunSession(queryClient);
  }
  principal = nextPrincipal;
}
