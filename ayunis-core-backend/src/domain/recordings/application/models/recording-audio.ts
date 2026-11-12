import type { UUID } from 'crypto';
import { RecordingStatus } from 'src/domain/recordings/domain/recording-status.enum';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

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

const STATUS_BY_SOURCE_STATUS: Record<SourceStatus, RecordingStatus> = {
  [SourceStatus.PROCESSING]: RecordingStatus.TRANSCRIBING,
  [SourceStatus.READY]: RecordingStatus.TRANSCRIBED,
  [SourceStatus.FAILED]: RecordingStatus.FAILED,
};

export function recordingStatusOf(
  audio: RecordingAudio | null,
): RecordingStatus {
  return audio
    ? STATUS_BY_SOURCE_STATUS[audio.sourceStatus]
    : RecordingStatus.UPLOADING;
}
