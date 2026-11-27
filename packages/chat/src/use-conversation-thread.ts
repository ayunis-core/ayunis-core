import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getActiveRunsControllerFindActiveQueryKey,
  getThreadSourcesControllerGetProcessingProgressQueryKey,
  threadSourcesControllerGetProcessingProgress,
  useActiveRunsControllerFindActive,
  useThreadsControllerFindOne,
} from '@ayunis/api-client/endpoints';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import { isSourcePending, useProcessingPollInterval } from './processing-poll';
import type { ChatActiveRunSnapshot } from './chat-conversation-config';
import type { ChatRunLifecycle } from './run-lifecycle';

/** Runs, including routine executions, start and end without this view. */
const POLL_WHILE_RUNNING_MS = 3_000;
const POLL_WHILE_IDLE_MS = 30_000;

export function hasProcessingSource(thread: GetThreadResponseDto): boolean {
  return thread.sources.some(({ status }) => status === 'processing');
}

/**
 * The chat as stored, refetched while a file is processing. Polling stops
 * while an answer streams, since it can replace local output with stale text.
 */
export function useConversationThread(threadId: string, isStreaming: boolean) {
  const pollInterval = useProcessingPollInterval(threadId);
  return useThreadsControllerFindOne(threadId, {
    query: {
      staleTime: 0,
      // A re-index is polled for but, unlike processing, does not hold up sending.
      refetchInterval: (query) =>
        pollInterval(
          !isStreaming &&
            (query.state.data?.sources.some(isSourcePending) ?? false),
        ),
    },
  });
}

/** The server's runs in progress, so a chat opened mid-run follows its run. */
export function useActiveRun(
  lifecycle: ChatRunLifecycle,
  threadId: string,
): ChatActiveRunSnapshot {
  const { data, dataUpdatedAt, isFetching } = useActiveRunsControllerFindActive(
    {
      query: {
        queryKey: getActiveRunsControllerFindActiveQueryKey(),
        staleTime: 0,
        refetchInterval: (query) =>
          (query.state.data?.length ?? 0) > 0
            ? POLL_WHILE_RUNNING_MS
            : POLL_WHILE_IDLE_MS,
      },
    },
  );
  const run = useMemo(
    () => data?.find((active) => active.threadId === threadId),
    [data, threadId],
  );
  useEffect(() => {
    if (data) {
      lifecycle.forgetStoppedThreadRunsExcept(
        new Set(data.map((active) => active.threadId)),
      );
    }
  }, [data, lifecycle]);
  return { run, dataUpdatedAt, isFetching };
}

export function useSourceProcessingProgress(
  threadId: string,
  processing: boolean,
) {
  return useQuery({
    queryKey: getThreadSourcesControllerGetProcessingProgressQueryKey(threadId),
    queryFn: () => threadSourcesControllerGetProcessingProgress(threadId),
    enabled: processing,
    refetchInterval: processing ? 1500 : false,
  });
}
