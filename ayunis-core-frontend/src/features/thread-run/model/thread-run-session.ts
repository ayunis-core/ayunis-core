import type { QueryClient } from '@tanstack/react-query';
import { getActiveRunsControllerFindActiveQueryKey } from '@ayunis/api-client/endpoints';
import { setWaitingMessagePrincipal } from '@/shared/lib/waiting-message-storage';
import { threadRunLifecycle } from './thread-run-lifecycle';

let principal: string | undefined;

export function resetThreadRunSession(queryClient: QueryClient): void {
  principal = undefined;
  // Also drops waiting messages and their kept text, and pending submissions.
  threadRunLifecycle.reset();
  setWaitingMessagePrincipal(undefined);
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
  setWaitingMessagePrincipal(nextPrincipal);
  principal = nextPrincipal;
}
