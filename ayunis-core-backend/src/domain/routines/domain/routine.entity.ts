import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import type { RoutineRunStatus } from './routine-run-status.enum';
import { RoutineInternetAccess } from './routine-internet-access';
import type { RoutineSchedule } from './routine-frequency';

export class Routine {
  readonly id: UUID;
  readonly userId: UUID;
  readonly orgId: UUID;
  readonly name: string;
  readonly prompt: string;
  /** Permitted model id; null with no `mode` means the owner's default model, also once the permit was removed. */
  readonly modelId: UUID | null;
  /** Resolved for each run, so runs follow the mode's model list; never set together with `modelId`. */
  readonly mode: ModelMode | null;
  readonly schedule: RoutineSchedule;
  readonly internetAccess: RoutineInternetAccess;
  /** Normalized hosts; stored in every mode, applied only in `allowlist`. */
  readonly allowedDomains: string[];
  /** Integrations whose tools the routine's runs may use. */
  readonly mcpIntegrationIds: UUID[];
  /** Personal knowledge bases its runs may query, while the owner can access them. */
  readonly knowledgeBaseIds: UUID[];
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
  /** The Marketplace entry the routine was installed from; the routine is an independent copy. */
  readonly marketplaceIdentifier: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    orgId: UUID;
    name: string;
    prompt: string;
    modelId: UUID | null;
    mode?: ModelMode | null;
    schedule: RoutineSchedule;
    internetAccess?: RoutineInternetAccess;
    allowedDomains?: string[];
    mcpIntegrationIds?: UUID[];
    knowledgeBaseIds?: UUID[];
    enabled: boolean;
    lastRunStatus?: RoutineRunStatus | null;
    lastRunAt?: Date | null;
    lastRunFailureReason?: string | null;
    consecutiveFailureCount?: number;
    nextRunAt?: Date | null;
    lastRunStartedAt?: Date | null;
    pausedAt?: Date | null;
    sourceToolCallId?: string | null;
    marketplaceIdentifier?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.name = params.name;
    this.prompt = params.prompt;
    this.modelId = params.modelId;
    this.mode = params.mode ?? null;
    this.schedule = params.schedule;
    this.internetAccess = params.internetAccess ?? RoutineInternetAccess.OFF;
    this.allowedDomains = params.allowedDomains ?? [];
    this.mcpIntegrationIds = params.mcpIntegrationIds ?? [];
    this.knowledgeBaseIds = params.knowledgeBaseIds ?? [];
    this.enabled = params.enabled;
    this.lastRunStatus = params.lastRunStatus ?? null;
    this.lastRunAt = params.lastRunAt ?? null;
    this.lastRunFailureReason = params.lastRunFailureReason ?? null;
    this.consecutiveFailureCount = params.consecutiveFailureCount ?? 0;
    this.nextRunAt = params.nextRunAt ?? null;
    this.lastRunStartedAt = params.lastRunStartedAt ?? null;
    this.pausedAt = params.pausedAt ?? null;
    this.sourceToolCallId = params.sourceToolCallId ?? null;
    this.marketplaceIdentifier = params.marketplaceIdentifier ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
