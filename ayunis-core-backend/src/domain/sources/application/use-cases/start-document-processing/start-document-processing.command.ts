export class StartDocumentProcessingCommand {
  /** Disk path of the multer upload; the file is streamed from here, never buffered. */
  readonly filePath: string;
  readonly fileName: string;
  readonly fileType: string;

  constructor(params: {
    filePath: string;
    fileName: string;
    fileType: string;
  }) {
    this.filePath = params.filePath;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
  }
}
