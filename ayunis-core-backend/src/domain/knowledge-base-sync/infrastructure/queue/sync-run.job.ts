import type { UUID } from 'crypto';

export interface SyncRunJobData {
  orgId: UUID;
  locationId: UUID;
  /** Set once the run has applied the changes and feeds the files. */
  feeding?: boolean;
  /** The last file fed; the next batch starts after it. */
  afterFileId?: UUID;
  /** The pauses the run took for provider outages so far. */
  pauses?: number;
}
