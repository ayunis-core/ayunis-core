export enum SyncLocationOutcome {
  SYNCED = 'synced',
  ACCESS_LOST = 'access_lost',
  THROTTLED = 'throttled',
  /** Connectors are switched off; nothing was synced. */
  DISABLED = 'disabled',
  /** Another sync of the location was recorded meanwhile; nothing applied. */
  SUPERSEDED = 'superseded',
}

export interface SyncSummary {
  /** Documents created for new files or files that got room. */
  added: number;
  removed: number;
  /** Renamed or moved without a new version; nothing re-processed. */
  relabelled: number;
  /** Files with a document whose content changed in this sync. */
  contentChanged: number;
  /** All files of the location that cannot be processed. */
  skipped: number;
  /** All files of the location waiting for room in the knowledge base. */
  notSyncedLimitReached: number;
}

export type SyncLocationResult =
  | { outcome: SyncLocationOutcome.SYNCED; summary: SyncSummary }
  | { outcome: SyncLocationOutcome.ACCESS_LOST }
  | { outcome: SyncLocationOutcome.THROTTLED; retryAt: Date }
  | { outcome: SyncLocationOutcome.DISABLED }
  | { outcome: SyncLocationOutcome.SUPERSEDED };
