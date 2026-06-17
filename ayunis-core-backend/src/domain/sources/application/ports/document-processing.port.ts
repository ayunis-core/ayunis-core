import type { UUID } from 'crypto';

export interface DocumentProcessingJobData {
  sourceId: UUID;
  orgId: UUID;
  userId: UUID;
  minioPath: string;
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
