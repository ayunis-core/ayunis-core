/** Result object the service writes to `<keyPrefix>result.json` (contract §4). */
export const EXTRACTION_RESULT_SCHEMA_VERSION = 1;

export type ExtractionPageMethod = 'text' | 'ocr' | 'text_fallback' | 'blank';

export interface ExtractionResultPage {
  /** 0-based position in the document. */
  index: number;
  /** 1-based page number, what the backend stores. */
  number: number;
  text: string;
  method: ExtractionPageMethod;
  ocrReason: string | null;
  quality?: Record<string, number>;
}

export interface ExtractionResultDocument {
  fileName: string;
  declaredMimeType: string;
  detectedType: string;
  pageCount: number;
  converter: string | null;
  ocrModel: string | null;
  ruleVersion: string;
  pagesOcr: number;
  pagesText: number;
  pagesBlank: number;
  warnings: string[];
  timings: Partial<
    Record<
      'downloadMs' | 'conversionMs' | 'analysisMs' | 'ocrMs' | 'totalMs',
      number
    >
  >;
}

export interface ExtractionResult {
  schemaVersion: typeof EXTRACTION_RESULT_SCHEMA_VERSION;
  jobId: string;
  idempotencyKey: string;
  document: ExtractionResultDocument;
  pages: ExtractionResultPage[];
}
