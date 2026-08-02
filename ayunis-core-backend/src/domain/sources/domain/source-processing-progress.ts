export enum SourceProcessingStage {
  EXTRACTING = 'extracting',
  INDEXING = 'indexing',
  PARSING = 'parsing',
}

/** Snapshot of how far a PROCESSING source has come; null once terminal. */
export interface SourceProcessingProgress {
  stage: SourceProcessingStage;
  processedPages?: number;
  totalPages?: number;
}
