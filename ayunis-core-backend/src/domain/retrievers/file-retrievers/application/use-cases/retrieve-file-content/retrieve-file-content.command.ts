import type { ProcessingContext } from 'src/common/types/processing-context';
import type { LocalFile } from 'src/domain/retrievers/file-retrievers/domain/file.entity';

export class RetrieveFileContentCommand {
  public readonly fileData: Buffer;
  /** A PDF, office document or recording already on local disk; `fileData` is then empty. */
  public readonly localFile?: LocalFile;
  public readonly fileName: string;
  public readonly fileType: string;
  public readonly allowLocalPdfParsing: boolean;
  public readonly pdfPageLimit: number | undefined;
  public readonly processingContext?: ProcessingContext;
  public readonly cacheIdentity?: string;

  constructor(params: {
    fileData: Buffer;
    localFile?: LocalFile;
    fileName: string;
    fileType: string;
    allowLocalPdfParsing?: boolean;
    pdfPageLimit?: number;
    processingContext?: ProcessingContext;
    cacheIdentity?: string;
  }) {
    this.fileData = params.fileData;
    this.localFile = params.localFile;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
    this.allowLocalPdfParsing = params.allowLocalPdfParsing ?? true;
    this.pdfPageLimit = params.pdfPageLimit;
    this.processingContext = params.processingContext;
    this.cacheIdentity = params.cacheIdentity;
  }
}
