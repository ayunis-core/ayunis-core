import { useThreadRunReattach as useRunReattach } from '@ayunis/chat/runs';
import { threadRunLifecycle, useActiveThreadRuns } from '@/features/thread-run';

export function useThreadRunReattach(
  params: Parameters<typeof useRunReattach>[1],
) {
  const { runsByThreadId, dataUpdatedAt, isFetching } = useActiveThreadRuns();
  return useRunReattach(threadRunLifecycle, params, {
    run: runsByThreadId.get(params.threadId),
    dataUpdatedAt,
    isFetching,
  });
}
