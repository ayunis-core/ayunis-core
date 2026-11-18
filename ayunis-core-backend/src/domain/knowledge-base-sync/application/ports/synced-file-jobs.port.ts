import type { UUID } from 'crypto';

/** One file to read and index at the version it was listed with. */
export interface SyncedFileJobData {
  orgId: UUID;
  knowledgeBaseId: UUID;
  locationId: UUID;
  syncedFileId: UUID;
  /** The file's document when the job was queued. */
  sourceId: UUID;
  version: string;
  /** The pauses the job took for provider outages so far. */
  pauses?: number;
}

/** The queued sync of a location that waits for a batch of its files. */
export interface SyncRunReference {
  id: string;
  queue: string;
}

export abstract class SyncedFileJobsPort {
  /**
   * Enqueues a batch of the files of `run`, which waits for it, each version
   * of a document once, however often it is passed; a file imported again
   * after its document was removed gets a new job.
   */
  abstract enqueue(
    orgId: UUID,
    jobs: SyncedFileJobData[],
    run: SyncRunReference,
  ): Promise<void>;

  /**
   * Best effort: removes the jobs of these document versions that wait or
   * are delayed; a running one stops once it sees its document gone.
   */
  abstract remove(
    jobs: Pick<SyncedFileJobData, 'sourceId' | 'version'>[],
  ): Promise<void>;
}
