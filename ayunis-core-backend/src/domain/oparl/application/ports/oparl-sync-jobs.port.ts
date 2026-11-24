import type { UUID } from 'crypto';

/** Queues work per system; a system has at most one run and one document job queued or running. */
export abstract class OparlSyncJobsPort {
  abstract enqueue(systemIds: UUID[]): Promise<void>;

  /** Reads and indexes the systems' documents, at a lower priority than syncs. */
  abstract enqueueDocuments(systemIds: UUID[]): Promise<void>;

  /** Those of the systems with a run queued or running. */
  abstract withRunQueued(systemIds: UUID[]): Promise<UUID[]>;
}
