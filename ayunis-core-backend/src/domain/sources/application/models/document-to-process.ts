import type { UUID } from 'crypto';

/** A stored file the document pipeline turns into its source's text and index. */
export interface DocumentToProcess {
  sourceId: UUID;
  orgId: UUID;
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
