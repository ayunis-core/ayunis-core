import type { UUID } from 'crypto';

/** Queues a sync run per system; a system has at most one queued or running. */
export abstract class OparlSyncJobsPort {
  abstract enqueue(systemIds: UUID[]): Promise<void>;
}
