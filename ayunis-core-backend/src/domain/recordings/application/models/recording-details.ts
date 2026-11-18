import type { RecordingAudio } from 'src/domain/recordings/application/models/recording-audio';
import type { Recording } from 'src/domain/recordings/domain/recording';

export interface RecordingDetails {
  recording: Recording;
  /** Null once the creator has been deleted. */
  creatorName: string | null;
  /** Null until an upload of the audio has completed. */
  audio: RecordingAudio | null;
}
