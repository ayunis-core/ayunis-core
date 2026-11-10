import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { RoutineRunStatus } from './routine-run-status.enum';

export class Routine {
  readonly id: UUID;
  readonly userId: UUID;
  readonly orgId: UUID;
  readonly name: string;
  readonly prompt: string;
  /** Permitted model id; null means the owner's default model, also once the permit was removed. */
  readonly modelId: UUID | null;
  /** HH:mm in Europe/Berlin. */
  readonly dailyTime: string;
  readonly internetEnabled: boolean;
  readonly enabled: boolean;
  readonly lastRunStatus: RoutineRunStatus | null;
  readonly lastRunAt: Date | null;
  readonly lastRunFailureReason: string | null;
  readonly consecutiveFailureCount: number;
  /** When the next scheduled run is due; null while the routine is disabled. */
  readonly nextRunAt: Date | null;
  /** When the current or last run started. */
  readonly lastRunStartedAt: Date | null;
  /** Set when repeated failures disabled the routine; cleared by re-enabling it. */
  readonly pausedAt: Date | null;
  /** The chat `create_routine` call the routine was created from, so the proposal is not saved twice. */
  readonly sourceToolCallId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    orgId: UUID;
    name: string;
    prompt: string;
    modelId: UUID | null;
    dailyTime: string;
    internetEnabled: boolean;
    enabled: boolean;
    lastRunStatus?: RoutineRunStatus | null;
    lastRunAt?: Date | null;
    lastRunFailureReason?: string | null;
    consecutiveFailureCount?: number;
    nextRunAt?: Date | null;
    lastRunStartedAt?: Date | null;
    pausedAt?: Date | null;
    sourceToolCallId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.name = params.name;
    this.prompt = params.prompt;
    this.modelId = params.modelId;
    this.dailyTime = params.dailyTime;
    this.internetEnabled = params.internetEnabled;
    this.enabled = params.enabled;
    this.lastRunStatus = params.lastRunStatus ?? null;
    this.lastRunAt = params.lastRunAt ?? null;
    this.lastRunFailureReason = params.lastRunFailureReason ?? null;
    this.consecutiveFailureCount = params.consecutiveFailureCount ?? 0;
    this.nextRunAt = params.nextRunAt ?? null;
    this.lastRunStartedAt = params.lastRunStartedAt ?? null;
    this.pausedAt = params.pausedAt ?? null;
    this.sourceToolCallId = params.sourceToolCallId ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
