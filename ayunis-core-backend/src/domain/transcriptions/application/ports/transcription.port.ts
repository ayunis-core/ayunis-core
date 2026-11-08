import type { RecordingTranscript } from 'src/domain/transcriptions/domain/recording-transcript';

/** A segment on local disk, uploaded from there instead of from memory. */
export interface AudioFileRef {
  path: string;
  size: number;
}

export abstract class TranscriptionPort {
  abstract transcribeSegment(
    file: Buffer | AudioFileRef,
    fileName: string,
    mimeType: string,
    language?: string,
  ): Promise<RecordingTranscript>;

  abstract transcribe(
    file: Buffer,
    fileName: string,
    mimeType: string,
    language?: string,
  ): Promise<string>;
}
