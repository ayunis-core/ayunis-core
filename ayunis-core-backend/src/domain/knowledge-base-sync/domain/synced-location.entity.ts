import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { SyncedLocationState } from './synced-location-state.enum';

/**
 * One URL a user added to a knowledge base; everything below it is synced
 * through the organization's connector.
 */
export class SyncedLocation {
  readonly id: UUID;
  readonly orgId: UUID;
  readonly knowledgeBaseId: UUID;
  readonly connectorId: UUID;
  readonly location: string;
  /** The connector's opaque position; `null` before the first sync. */
  readonly cursor: string | null;
  readonly state: SyncedLocationState;
  readonly lastSyncedAt: Date | null;
  /** When the next scheduled sync is due. */
  readonly nextSyncAt: Date;
  /** Since when a sync runs, until its files are processed; `null` between. */
  readonly syncingSince: Date | null;
  /**
   * Until when syncing waits after a provider outage or throttling; once
   * past, the pause is over.
   */
  readonly pausedUntil: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    knowledgeBaseId: UUID;
    connectorId: UUID;
    location: string;
    cursor?: string | null;
    state?: SyncedLocationState;
    lastSyncedAt?: Date | null;
    nextSyncAt?: Date;
    syncingSince?: Date | null;
    pausedUntil?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.connectorId = params.connectorId;
    this.location = params.location;
    this.cursor = params.cursor ?? null;
    this.state = params.state ?? SyncedLocationState.ACTIVE;
    this.lastSyncedAt = params.lastSyncedAt ?? null;
    this.nextSyncAt = params.nextSyncAt ?? new Date();
    this.syncingSince = params.syncingSince ?? null;
    this.pausedUntil = params.pausedUntil ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  /** The end of the pause the location is in at `now`, if any. */
  pausedAt(now: Date): Date | null {
    return this.pausedUntil && this.pausedUntil > now ? this.pausedUntil : null;
  }
}
