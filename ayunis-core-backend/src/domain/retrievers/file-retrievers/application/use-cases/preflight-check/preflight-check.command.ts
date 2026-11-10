import type { PdfFileRef } from 'src/domain/retrievers/file-retrievers/application/ports/pdf-batcher.port';

export class PreflightCheckCommand {
  public readonly fileData: Buffer;
  /** Set when the file is on local disk; `fileData` is then empty. */
  public readonly localFile?: PdfFileRef;
  public readonly fileName: string;
  public readonly fileType: string;

  constructor(params: {
    fileData: Buffer;
    localFile?: PdfFileRef;
    fileName: string;
    fileType: string;
  }) {
    this.fileData = params.fileData;
    this.localFile = params.localFile;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
  }
}
