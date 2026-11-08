import { useEffect, useMemo } from 'react';
import {
  getActiveRunsControllerFindActiveQueryKey,
  useActiveRunsControllerFindActive,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { ActiveThreadRunResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { forgetStoppedThreadRunsExcept } from '@/features/thread-run/model/stopped-thread-runs';

/** Runs, including routine executions, start and end without this tab. */
const POLL_WHILE_RUNNING_MS = 3_000;
const POLL_WHILE_IDLE_MS = 30_000;

const NO_RUNS: ActiveThreadRunResponseDto[] = [];

export function activeThreadRunsQueryKey() {
  return getActiveRunsControllerFindActiveQueryKey();
}

export function useActiveThreadRuns() {
  const { data, dataUpdatedAt } = useActiveRunsControllerFindActive({
    query: {
      queryKey: getActiveRunsControllerFindActiveQueryKey(),
      staleTime: 0,
      refetchInterval: (query) =>
        (query.state.data?.length ?? 0) > 0
          ? POLL_WHILE_RUNNING_MS
          : POLL_WHILE_IDLE_MS,
    },
  });
  const runs = data ?? NO_RUNS;
  const runsByThreadId = useMemo(
    () => new Map(runs.map((run) => [run.threadId, run])),
    [runs],
  );
  useEffect(() => {
    if (data) forgetStoppedThreadRunsExcept(new Set(runsByThreadId.keys()));
  }, [data, runsByThreadId]);
  return { runsByThreadId, dataUpdatedAt };
}
