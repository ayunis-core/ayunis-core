export interface TranscriptSegment {
  text: string;
  speakerId?: string;
  start: number;
  end: number;
}

export interface RecordingTranscript {
  text: string;
  segments: TranscriptSegment[];
}
