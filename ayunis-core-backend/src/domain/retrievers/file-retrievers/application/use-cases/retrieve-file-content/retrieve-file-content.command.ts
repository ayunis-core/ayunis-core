import type { ProcessingContext } from 'src/common/types/processing-context';

export class RetrieveFileContentCommand {
  public readonly fileData: Buffer;
  public readonly fileName: string;
  public readonly fileType: string;
  public readonly allowLocalPdfParsing: boolean;
  public readonly pdfPageLimit: number | undefined;
  public readonly processingContext?: ProcessingContext;
  public readonly cacheIdentity?: string;

  constructor(params: {
    fileData: Buffer;
    fileName: string;
    fileType: string;
    allowLocalPdfParsing?: boolean;
    pdfPageLimit?: number;
    processingContext?: ProcessingContext;
    cacheIdentity?: string;
  }) {
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
    this.allowLocalPdfParsing = params.allowLocalPdfParsing ?? true;
    this.pdfPageLimit = params.pdfPageLimit;
    this.processingContext = params.processingContext;
    this.cacheIdentity = params.cacheIdentity;
  }
}
