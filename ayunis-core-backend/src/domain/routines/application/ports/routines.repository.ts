import type { UUID } from 'crypto';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import type { RoutineRunOutcome } from 'src/domain/routines/domain/routine-run-outcome';
import type { RoutineRunStatus } from 'src/domain/routines/domain/routine-run-status.enum';
import type { RoutineScheduleChanges } from 'src/domain/routines/domain/routine-schedule';

/** The fields a user edits; omitted properties stay unchanged. */
export interface RoutineDefinitionChanges {
  name?: string;
  prompt?: string;
  modelId?: UUID;
  dailyTime?: string;
  internetEnabled?: boolean;
  enabled?: boolean;
}

/** What the sweep needs to start or skip an enabled routine's due run. */
export interface DueRoutine {
  id: UUID;
  userId: UUID;
  orgId: UUID;
  dailyTime: string;
  nextRunAt: Date;
}

export abstract class RoutinesRepository {
  abstract create(routine: Routine): Promise<Routine>;
  abstract findById(userId: UUID, id: UUID): Promise<Routine | null>;
  /**
   * Locks the row until the surrounding transaction ends, so a decision based
   * on it (e.g. re-enabling) stays valid until it is written.
   */
  abstract findByIdForUpdate(userId: UUID, id: UUID): Promise<Routine | null>;
  /** Unscoped read for the worker, which runs before any user context exists. */
  abstract findByIdForExecution(id: UUID): Promise<Routine | null>;
  abstract findAllByUserId(userId: UUID): Promise<Routine[]>;
  /** Enabled routines whose next run is due by `now`, earliest first. */
  abstract findDue(now: Date, limit: number): Promise<DueRoutine[]>;
  /** Writes only the given fields, so a concurrent run's status survives. */
  abstract updateDefinition(
    userId: UUID,
    id: UUID,
    changes: RoutineDefinitionChanges & RoutineScheduleChanges,
  ): Promise<Routine | null>;
  abstract delete(userId: UUID, id: UUID): Promise<boolean>;
  /**
   * Moves an enabled routine's next run from `expected` to `next`. Returns
   * false when another sweep (or an edit) already moved it, so only one
   * caller acts on a due run.
   */
  abstract moveNextRunAt(
    id: UUID,
    expected: Date,
    next: Date,
  ): Promise<boolean>;
  /**
   * Shows the routine as queued unless a run is already queued or running,
   * whose status must stay. Returns whether the status changed.
   */
  abstract markRunQueued(id: UUID): Promise<boolean>;
  abstract setRunStatus(
    id: UUID,
    status: RoutineRunStatus | null,
  ): Promise<void>;
  /**
   * Claims the run of one execution request and marks it running from
   * `startedAt`. Returns false, changing nothing, when a run for
   * `executionKey` already started (a repeated delivery of the same queue
   * job) or, with `onlyIfEnabled`, when the routine is disabled.
   */
  abstract markRunStarted(
    id: UUID,
    startedAt: Date,
    options: { executionKey: string; onlyIfEnabled: boolean },
  ): Promise<boolean>;
  /**
   * Also resets or increments the consecutive failure count, and pauses an
   * enabled routine whose failure count reaches the limit. Returns whether
   * this outcome paused it.
   */
  abstract recordRunOutcome(
    id: UUID,
    outcome: RoutineRunOutcome,
    finishedAt: Date,
  ): Promise<{ paused: boolean }>;
  /**
   * Records runs still shown as running that started before `startedBefore`
   * as failed with `failureReason`, counted and paused like any failure.
   * Returns how many were recorded.
   */
  abstract failRunsStartedBefore(
    startedBefore: Date,
    failureReason: string,
    finishedAt: Date,
  ): Promise<number>;
}
