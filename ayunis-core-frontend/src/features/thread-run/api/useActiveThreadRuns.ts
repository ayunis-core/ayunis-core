import { useEffect, useMemo } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import {
  getActiveRunsControllerFindActiveQueryKey,
  useActiveRunsControllerFindActive,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { ActiveThreadRunResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { forgetStoppedThreadRunsExcept } from '@/features/thread-run/model/stopped-thread-runs';
import {
  expectThreadRunSoon,
  isThreadRunExpected,
} from '@/features/thread-run/model/expected-thread-run';

/** Runs, including routine executions, start and end without this tab. */
const POLL_WHILE_RUNNING_MS = 3_000;
/** Short runs, e.g. a simple routine, end within a few seconds of starting. */
const POLL_WHILE_EXPECTED_MS = 1_000;
const POLL_WHILE_IDLE_MS = 30_000;

const NO_RUNS: ActiveThreadRunResponseDto[] = [];

export function activeThreadRunsQueryKey() {
  return getActiveRunsControllerFindActiveQueryKey();
}

/** Polls quickly for a while, so a run a queued job is about to start shows soon. */
export function expectActiveThreadRun(queryClient: QueryClient): void {
  expectThreadRunSoon();
  void queryClient.invalidateQueries({ queryKey: activeThreadRunsQueryKey() });
}

export function useActiveThreadRuns() {
  const { data, dataUpdatedAt } = useActiveRunsControllerFindActive({
    query: {
      queryKey: getActiveRunsControllerFindActiveQueryKey(),
      staleTime: 0,
      refetchInterval: (query) => {
        if (isThreadRunExpected()) return POLL_WHILE_EXPECTED_MS;
        return (query.state.data?.length ?? 0) > 0
          ? POLL_WHILE_RUNNING_MS
          : POLL_WHILE_IDLE_MS;
      },
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
