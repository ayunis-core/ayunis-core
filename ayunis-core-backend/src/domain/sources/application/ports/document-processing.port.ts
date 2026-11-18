import type { UUID } from 'crypto';
import type { DocumentToProcess } from 'src/domain/sources/application/models/document-to-process';

export interface DocumentProcessingJobData extends DocumentToProcess {
  userId: UUID;
}

/**
 * Port for enqueuing document processing jobs.
 */
export abstract class DocumentProcessingPort {
  abstract enqueue(data: DocumentProcessingJobData): Promise<void>;
  /** Best-effort cancellation: remove a waiting/delayed job or signal an active one. */
  abstract cancelJob(sourceId: UUID): Promise<void>;
}
