import type { Recording } from 'src/domain/recordings/domain/recording';

export interface RecordingWithCreator {
  recording: Recording;
  /** Null once the creator has been deleted. */
  creatorName: string | null;
}
