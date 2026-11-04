import type { RecordingTranscript } from 'src/domain/transcriptions/domain/recording-transcript';

export abstract class TranscriptionPort {
  abstract transcribeSegment(
    file: Buffer,
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
