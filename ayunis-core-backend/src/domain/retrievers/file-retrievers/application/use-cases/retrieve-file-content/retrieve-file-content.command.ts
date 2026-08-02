import type { FileRetrieverPage } from '../../../domain/file-retriever-result.entity';

export interface ExtractedPageBatch {
  /** Pages completed in this step (1-based page numbers on the entries). */
  pages: FileRetrieverPage[];
  /** Pages done so far including skipped ones — for "page X of Y" progress. */
  processedPages: number;
  totalPages: number;
}

export class RetrieveFileContentCommand {
  public readonly fileData: Buffer;
  public readonly fileName: string;
  public readonly fileType: string;
  /** 0-based page indexes already extracted earlier (checkpoint resume) — not re-emitted. */
  public readonly skipPages?: number[];
  /** Invoked after the local text-layer pass and after every OCR batch. */
  public readonly onBatchExtracted?: (
    batch: ExtractedPageBatch,
  ) => Promise<void>;

  constructor(params: {
    fileData: Buffer;
    fileName: string;
    fileType: string;
    skipPages?: number[];
    onBatchExtracted?: (batch: ExtractedPageBatch) => Promise<void>;
  }) {
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
    this.skipPages = params.skipPages;
    this.onBatchExtracted = params.onBatchExtracted;
  }
}
