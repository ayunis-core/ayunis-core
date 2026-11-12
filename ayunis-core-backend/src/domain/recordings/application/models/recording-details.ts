import type { RecordingAudio } from 'src/domain/recordings/application/models/recording-audio';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { RecordingStatus } from 'src/domain/recordings/domain/recording-status.enum';
import type { RecordingSummary } from 'src/domain/recordings/domain/recording-summary.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

export interface RecordingDetails {
  recording: Recording;
  /** Null once the creator has been deleted. */
  creatorName: string | null;
  /** Null until an upload of the audio has completed. */
  audio: RecordingAudio | null;
  /** Null until the transcript is ready. */
  summary: RecordingSummary | null;
}

const STATUS_BY_SOURCE_STATUS: Record<SourceStatus, RecordingStatus> = {
  [SourceStatus.PROCESSING]: RecordingStatus.TRANSCRIBING,
  [SourceStatus.READY]: RecordingStatus.READY,
  [SourceStatus.FAILED]: RecordingStatus.FAILED,
};

export function recordingStatusOf({
  audio,
  summary,
}: Pick<RecordingDetails, 'audio' | 'summary'>): RecordingStatus {
  if (!audio) return RecordingStatus.UPLOADING;
  const status = STATUS_BY_SOURCE_STATUS[audio.sourceStatus];
  return status === RecordingStatus.READY && summary?.isInProgress
    ? RecordingStatus.SUMMARIZING
    : status;
}
