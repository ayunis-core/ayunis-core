import type { UUID } from 'crypto';

export interface DocumentProcessingJobData {
  sourceId: UUID;
  orgId: UUID;
  userId: UUID;
  minioPath: string;
  fileName: string;
  fileType: string;
  /**
   * True for directly uploaded originals, which stay in storage while their
   * source exists; absent for legacy staged files the consumer removes.
   */
  retainFile?: boolean;
  /**
   * Size the upload was verified at. The consumer refuses an object of any
   * other size, since the browser's signed URLs may outlive completion.
   */
  expectedSize?: number;
  expectedETag?: string;
  /**
   * True for meeting recordings: the transcript is kept as timed speaker
   * segments and indexed in chunks that know their time range.
   */
  keepTranscriptSegments?: boolean;
}

/**
 * Port for enqueuing document processing jobs.
 */
export abstract class DocumentProcessingPort {
  abstract enqueue(data: DocumentProcessingJobData): Promise<void>;
  /** Best-effort cancellation: remove a waiting/delayed job or signal an active one. */
  abstract cancelJob(sourceId: UUID): Promise<void>;
}
