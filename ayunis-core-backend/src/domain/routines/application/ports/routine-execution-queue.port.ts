import type { UUID } from 'crypto';
import type { RoutineRunTrigger } from 'src/domain/routines/domain/routine-run-trigger.enum';

export interface RoutineExecutionTarget {
  routineId: UUID;
  userId: UUID;
  orgId: UUID;
}

export interface RoutineExecutionJobData extends RoutineExecutionTarget {
  trigger: RoutineRunTrigger;
}

export abstract class RoutineExecutionQueue {
  /** At most one pending manual run per routine; a repeat request is a no-op. */
  abstract enqueueRunNow(target: RoutineExecutionTarget): Promise<void>;
  /**
   * One job per routine and scheduled start (`runKey`, see
   * `scheduledRunKey`): enqueuing the same start again adds nothing while
   * that job is kept.
   */
  abstract enqueueScheduled(
    target: RoutineExecutionTarget,
    runKey: string,
  ): Promise<void>;
}
