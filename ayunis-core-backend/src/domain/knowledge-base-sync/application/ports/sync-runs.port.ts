import type { UUID } from 'crypto';

export interface SyncRunRequest {
  orgId: UUID;
  locationId: UUID;
}

/**
 * Queues location syncs: a run lists the location's changes and then feeds
 * its files to processing batch by batch, until every one is processed.
 */
export abstract class SyncRunsPort {
  /**
   * Queues a run for each location that has none queued or running, so a
   * location never syncs twice at once, across every instance.
   */
  abstract enqueue(runs: SyncRunRequest[]): Promise<void>;

  /**
   * Best effort: removes the location's run with its waiting files unless
   * one of them is running; a running one ends once it sees the location
   * gone.
   */
  abstract remove(locationId: UUID): Promise<void>;
}
