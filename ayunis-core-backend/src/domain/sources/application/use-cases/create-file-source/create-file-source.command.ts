export class CreateFileSourceCommand {
  fileData: Buffer;
  fileName: string;
  fileType: string;
  fileSize: number;

  constructor(params: {
    fileData: Buffer;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) {
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
    this.fileSize = params.fileSize;
  }
}
