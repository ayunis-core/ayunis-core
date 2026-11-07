import type { UUID } from 'crypto';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import type { RoutineRunOutcome } from 'src/domain/routines/domain/routine-run-outcome';
import type { RoutineRunStatus } from 'src/domain/routines/domain/routine-run-status.enum';

/** The fields a user edits; omitted properties stay unchanged. */
export interface RoutineDefinitionChanges {
  name?: string;
  prompt?: string;
  modelId?: UUID;
  dailyTime?: string;
  internetEnabled?: boolean;
  enabled?: boolean;
}

export abstract class RoutinesRepository {
  abstract create(routine: Routine): Promise<Routine>;
  abstract findById(userId: UUID, id: UUID): Promise<Routine | null>;
  /** Unscoped read for the worker, which runs before any user context exists. */
  abstract findByIdForExecution(id: UUID): Promise<Routine | null>;
  abstract findAllByUserId(userId: UUID): Promise<Routine[]>;
  /** Writes only the definition fields, so a concurrent run's status survives. */
  abstract updateDefinition(
    userId: UUID,
    id: UUID,
    changes: RoutineDefinitionChanges,
  ): Promise<Routine | null>;
  abstract delete(userId: UUID, id: UUID): Promise<boolean>;
  /**
   * Shows the routine as queued unless a run is already queued or running,
   * whose status must stay. Returns whether the status changed.
   */
  abstract markRunQueued(id: UUID): Promise<boolean>;
  abstract setRunStatus(
    id: UUID,
    status: RoutineRunStatus | null,
  ): Promise<void>;
  /** Also resets or increments the consecutive failure count. */
  abstract recordRunOutcome(
    id: UUID,
    outcome: RoutineRunOutcome,
    finishedAt: Date,
  ): Promise<void>;
}
