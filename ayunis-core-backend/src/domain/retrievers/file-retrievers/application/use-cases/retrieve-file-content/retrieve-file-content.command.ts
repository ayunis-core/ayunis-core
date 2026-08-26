export class RetrieveFileContentCommand {
  public readonly fileData: Buffer;
  public readonly fileName: string;
  public readonly fileType: string;
  public readonly allowLocalPdfParsing: boolean;
  public readonly pdfPageLimit: number | undefined;

  constructor(params: {
    fileData: Buffer;
    fileName: string;
    fileType: string;
    allowLocalPdfParsing?: boolean;
    pdfPageLimit?: number;
  }) {
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
    this.allowLocalPdfParsing = params.allowLocalPdfParsing ?? true;
    this.pdfPageLimit = params.pdfPageLimit;
  }
}
