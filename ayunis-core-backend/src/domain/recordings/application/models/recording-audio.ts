import type { UUID } from 'crypto';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import type { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

/**
 * A recording's uploaded audio: the source that keeps the original, its
 * transcript and its search index, and is transcribed in document processing.
 */
export interface RecordingAudio {
  sourceId: UUID;
  fileName: string;
  /** The retained original; null once processing released it. */
  storageKey: string | null;
  sourceStatus: SourceStatus;
  failureCode: SourceProcessingErrorCode | null;
}
