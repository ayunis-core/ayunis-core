import type { ProcessingContext } from 'src/common/types/processing-context';

export class TranscribeCommand {
  public readonly file: Buffer;
  public readonly fileName: string;
  public readonly mimeType: string;
  public readonly language?: string;
  public readonly processingContext?: ProcessingContext;

  constructor(params: {
    file: Buffer;
    fileName: string;
    mimeType: string;
    language?: string;
    processingContext?: ProcessingContext;
  }) {
    this.file = params.file;
    this.fileName = params.fileName;
    this.mimeType = params.mimeType;
    this.language = params.language;
    this.processingContext = params.processingContext;
  }
}
