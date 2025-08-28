export class ProcessFileCommand {
  public readonly fileData: Buffer;
  public readonly fileName: string;
  public readonly fileType: string;

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
