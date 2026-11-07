import type { UUID } from 'crypto';

export interface RoutineExecutionJobData {
  routineId: UUID;
  userId: UUID;
  orgId: UUID;
}

export abstract class RoutineExecutionQueue {
  /** At most one pending manual run per routine; a repeat request is a no-op. */
  abstract enqueueRunNow(data: RoutineExecutionJobData): Promise<void>;
}
