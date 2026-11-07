import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getRoutinesControllerFindAllQueryKey,
  getThreadsControllerFindAllQueryKey,
  useRoutinesControllerFindAll,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { Routine } from '@/pages/routines/model/openapi';
import { RoutineRunStatus } from '@/pages/routines/model/openapi';

const ACTIVE_RUN_POLL_MS = 3000;

function hasActiveRun(routines: readonly Routine[] | undefined): boolean {
  return (routines ?? []).some(
    (routine) =>
      routine.lastRunStatus === RoutineRunStatus.queued ||
      routine.lastRunStatus === RoutineRunStatus.running,
  );
}

/**
 * Polls while a run is queued or running. Every status change also refreshes
 * the chat lists, since a run creates its routine thread in the background.
 */
export function useRoutines() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useRoutinesControllerFindAll({
    query: {
      queryKey: getRoutinesControllerFindAllQueryKey(),
      refetchInterval: (query) =>
        hasActiveRun(query.state.data) ? ACTIVE_RUN_POLL_MS : false,
    },
  });

  useEffect(() => {
    if (!data) return;
    void queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindAllQueryKey(),
    });
  }, [data, queryClient]);

  return { routines: data ?? [], isLoading, error };
}
