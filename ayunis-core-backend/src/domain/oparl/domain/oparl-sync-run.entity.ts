import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { OparlEntityType } from './oparl-entity-type.enum';

export enum OparlSyncKind {
  /** The first complete import of a system. */
  INITIAL = 'initial',
  /** Changes since the last successful sync. */
  DELTA = 'delta',
  /** A complete listing that also removes what the system no longer lists. */
  FULL = 'full',
}

export enum OparlSyncRunStatus {
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  /** Finished, but a full listing was incomplete or would have removed too much; nothing was removed. */
  SUSPICIOUS = 'suspicious',
  FAILED = 'failed',
}

export type OparlTypeCounts = Partial<Record<OparlEntityType, number>>;

export interface OparlSyncRunStats {
  /** List pages fetched. */
  pages: number;
  written: OparlTypeCounts;
  deleted: OparlTypeCounts;
  /** Why a full listing removed nothing, when it did not. */
  reconciliation?: string;
}

export interface OparlSyncRunParams {
  id?: UUID;
  systemId: UUID;
  kind: OparlSyncKind;
  status?: OparlSyncRunStatus;
  modifiedSince: Date | null;
  startedAt?: Date;
  finishedAt?: Date | null;
  error?: string | null;
  stats?: OparlSyncRunStats;
}

export class OparlSyncRun {
  readonly id: UUID;
  readonly systemId: UUID;
  readonly kind: OparlSyncKind;
  status: OparlSyncRunStatus;
  /** The `modified_since` of a delta; `null` for a complete listing. */
  readonly modifiedSince: Date | null;
  readonly startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
  stats: OparlSyncRunStats;

  constructor(params: OparlSyncRunParams) {
    this.id = params.id ?? randomUUID();
    this.systemId = params.systemId;
    this.kind = params.kind;
    this.status = params.status ?? OparlSyncRunStatus.RUNNING;
    this.modifiedSince = params.modifiedSince;
    this.startedAt = params.startedAt ?? new Date();
    this.finishedAt = params.finishedAt ?? null;
    this.error = params.error ?? null;
    this.stats = params.stats ?? { pages: 0, written: {}, deleted: {} };
  }

  /** Whether the run removes what the system no longer lists. */
  get reconciles(): boolean {
    return this.kind !== OparlSyncKind.DELTA;
  }

  finish(status: OparlSyncRunStatus, error: string | null, now: Date): void {
    this.status = status;
    this.error = error;
    this.finishedAt = now;
  }
}
