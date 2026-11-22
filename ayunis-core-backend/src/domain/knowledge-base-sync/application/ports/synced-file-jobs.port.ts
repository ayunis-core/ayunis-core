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
}

export abstract class SyncedFileJobsPort {
  /**
   * Enqueues each version of a document once, however often it is passed; a
   * file imported again after its document was removed gets a new job.
   */
  abstract enqueue(orgId: UUID, jobs: SyncedFileJobData[]): Promise<void>;

  /**
   * Best effort: removes the jobs of these document versions that wait or
   * are delayed; a running one stops once it sees its document gone.
   */
  abstract remove(
    jobs: Pick<SyncedFileJobData, 'sourceId' | 'version'>[],
  ): Promise<void>;
}
