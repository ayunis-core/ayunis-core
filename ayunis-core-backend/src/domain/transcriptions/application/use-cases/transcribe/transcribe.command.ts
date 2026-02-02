export class TranscribeCommand {
  public readonly file: Buffer;
  public readonly fileName: string;
  public readonly mimeType: string;
  public readonly language?: string;

  constructor(params: {
    file: Buffer;
    fileName: string;
    mimeType: string;
    language?: string;
  }) {
    this.file = params.file;
    this.fileName = params.fileName;
    this.mimeType = params.mimeType;
    this.language = params.language;
  }
}
