export class StartDocumentProcessingCommand {
  readonly fileData: Buffer;
  readonly fileName: string;
  readonly fileType: string;

  constructor(params: {
    fileData: Buffer;
    fileName: string;
    fileType: string;
  }) {
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
  }
}
