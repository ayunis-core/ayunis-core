import type { ProcessingContext } from 'src/common/types/processing-context';

/** A recording streamed to local disk by the caller; `file` is then empty. */
export interface RecordingFile {
  path: string;
  size: number;
  sha256: string;
}

export class TranscribeCommand {
  public readonly file: Buffer;
  public readonly recording?: RecordingFile;
  public readonly fileName: string;
  public readonly mimeType: string;
  public readonly language?: string;
  public readonly processingContext?: ProcessingContext;

  constructor(params: {
    file: Buffer;
    recording?: RecordingFile;
    fileName: string;
    mimeType: string;
    language?: string;
    processingContext?: ProcessingContext;
  }) {
    this.file = params.file;
    this.recording = params.recording;
    this.fileName = params.fileName;
    this.mimeType = params.mimeType;
    this.language = params.language;
    this.processingContext = params.processingContext;
  }
}
