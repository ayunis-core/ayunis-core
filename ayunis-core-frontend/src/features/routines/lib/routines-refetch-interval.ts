import type { Routine } from '@/features/routines/model/openapi';
import { RoutineRunStatus } from '@/features/routines/model/openapi';

const ACTIVE_RUN_POLL_MS = 3_000;
/** Scheduled starts happen in the background, so an idle list goes stale. */
const IDLE_POLL_MS = 30_000;

export function routinesRefetchInterval(
  routines: readonly Routine[] | undefined,
): number {
  const hasActiveRun = (routines ?? []).some(
    (routine) =>
      routine.lastRunStatus === RoutineRunStatus.queued ||
      routine.lastRunStatus === RoutineRunStatus.running,
  );
  return hasActiveRun ? ACTIVE_RUN_POLL_MS : IDLE_POLL_MS;
}
