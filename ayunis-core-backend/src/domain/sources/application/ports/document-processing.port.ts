import type { UUID } from 'crypto';

export interface DocumentProcessingJobData {
  sourceId: UUID;
  orgId: UUID;
  userId: UUID;
  minioPath: string;
  /** Hash of the staged object; absent only on jobs enqueued before it was recorded. */
  sha256?: string;
  fileSizeBytes?: number;
  /** Set once the extraction service has accepted the job, so a later attempt can release it. */
  extractionJobId?: string;
  fileName: string;
  fileType: string;
}

/**
 * Port for enqueuing document processing jobs.
 */
export abstract class DocumentProcessingPort {
  abstract enqueue(data: DocumentProcessingJobData): Promise<void>;
  /** Best-effort cancellation: remove a waiting/delayed job or signal an active one. */
  abstract cancelJob(sourceId: UUID): Promise<void>;
}
