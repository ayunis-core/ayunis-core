import type { ProcessingContext } from 'src/common/types/processing-context';

/** A recording already on local disk; `fileData` is then empty. */
export interface RecordingFileRef {
  path: string;
  size: number;
  sha256: string;
}

export class RetrieveFileContentCommand {
  public readonly fileData: Buffer;
  public readonly recording?: RecordingFileRef;
  public readonly fileName: string;
  public readonly fileType: string;
  public readonly allowLocalPdfParsing: boolean;
  public readonly pdfPageLimit: number | undefined;
  public readonly processingContext?: ProcessingContext;
  public readonly cacheIdentity?: string;

  constructor(params: {
    fileData: Buffer;
    recording?: RecordingFileRef;
    fileName: string;
    fileType: string;
    allowLocalPdfParsing?: boolean;
    pdfPageLimit?: number;
    processingContext?: ProcessingContext;
    cacheIdentity?: string;
  }) {
    this.fileData = params.fileData;
    this.recording = params.recording;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
    this.allowLocalPdfParsing = params.allowLocalPdfParsing ?? true;
    this.pdfPageLimit = params.pdfPageLimit;
    this.processingContext = params.processingContext;
    this.cacheIdentity = params.cacheIdentity;
  }
}
