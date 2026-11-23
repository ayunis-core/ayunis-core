import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { OparlSystemHealth } from './oparl-system-health.enum';
import {
  OparlSyncKind,
  OparlSyncRun,
  OparlSyncRunStatus,
} from './oparl-sync-run.entity';
import {
  modifiedSinceFor,
  nextSyncAfter,
  nextSyncKind,
} from './oparl-sync-schedule';

export interface OparlSystemMetadata {
  oparlId: string;
  name: string | null;
  vendor: string | null;
  product: string | null;
  oparlVersion: string | null;
  website: string | null;
  raw: Record<string, unknown>;
}

export interface OparlSystemParams extends OparlSystemMetadata {
  id?: UUID;
  url: string;
  nextSyncAt?: Date;
  lastDeltaSyncAt?: Date | null;
  lastFullSyncAt?: Date | null;
  lastRunStatus?: OparlSyncRunStatus | null;
  lastRunFinishedAt?: Date | null;
  lastError?: string | null;
  consecutiveFailures?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * An OParl system in the installation-wide catalog, with the state of its
 * mirror's syncs. Global: no organization owns it.
 */
export class OparlSystem {
  readonly id: UUID;
  /** The URL the system was added under, normalized; unique. */
  readonly url: string;
  oparlId: string;
  name: string | null;
  vendor: string | null;
  product: string | null;
  oparlVersion: string | null;
  website: string | null;
  raw: Record<string, unknown>;
  nextSyncAt: Date;
  /** Start of the last successful delta. */
  lastDeltaSyncAt: Date | null;
  /** Start of the last successful initial import or full reconciliation. */
  lastFullSyncAt: Date | null;
  lastRunStatus: OparlSyncRunStatus | null;
  lastRunFinishedAt: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(params: OparlSystemParams) {
    this.id = params.id ?? randomUUID();
    this.url = params.url;
    this.oparlId = params.oparlId;
    this.name = params.name;
    this.vendor = params.vendor;
    this.product = params.product;
    this.oparlVersion = params.oparlVersion;
    this.website = params.website;
    this.raw = params.raw;
    this.nextSyncAt = params.nextSyncAt ?? new Date();
    this.lastDeltaSyncAt = params.lastDeltaSyncAt ?? null;
    this.lastFullSyncAt = params.lastFullSyncAt ?? null;
    this.lastRunStatus = params.lastRunStatus ?? null;
    this.lastRunFinishedAt = params.lastRunFinishedAt ?? null;
    this.lastError = params.lastError ?? null;
    this.consecutiveFailures = params.consecutiveFailures ?? 0;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get health(): OparlSystemHealth {
    switch (this.lastRunStatus) {
      case null:
        return OparlSystemHealth.PENDING;
      case OparlSyncRunStatus.FAILED:
        return OparlSystemHealth.FAILING;
      case OparlSyncRunStatus.SUSPICIOUS:
        return OparlSystemHealth.SUSPICIOUS;
      case OparlSyncRunStatus.SUCCEEDED:
      case OparlSyncRunStatus.RUNNING:
        return OparlSystemHealth.HEALTHY;
    }
  }

  planRun(now: Date): OparlSyncRun {
    const kind = nextSyncKind(this, now);
    return new OparlSyncRun({
      systemId: this.id,
      kind,
      modifiedSince:
        kind === OparlSyncKind.DELTA ? modifiedSinceFor(this) : null,
      startedAt: now,
    });
  }

  recordFinishedRun(run: OparlSyncRun, now: Date): void {
    const failed = run.status === OparlSyncRunStatus.FAILED;
    this.lastRunStatus = run.status;
    this.lastRunFinishedAt = now;
    this.lastError = run.error;
    this.consecutiveFailures = failed ? this.consecutiveFailures + 1 : 0;
    if (run.status === OparlSyncRunStatus.SUCCEEDED) {
      if (run.kind === OparlSyncKind.DELTA)
        this.lastDeltaSyncAt = run.startedAt;
      else this.lastFullSyncAt = run.startedAt;
    }
    this.nextSyncAt = nextSyncAfter(
      run.status,
      run.startedAt,
      this.consecutiveFailures,
      now,
    );
  }
}
