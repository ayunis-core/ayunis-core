import type { UUID } from 'crypto';

export interface SourceReindexJobData {
  sourceId: UUID;
  orgId: UUID;
}

/**
 * Port for queueing the re-embedding of REINDEXING sources. The queue is
 * separate from the upload queues, so re-indexing never delays an upload.
 */
export abstract class SourceReindexProcessingPort {
  /** A source whose job is still waiting or running keeps that job. */
  abstract enqueue(orgId: UUID, sourceIds: UUID[]): Promise<void>;
}
