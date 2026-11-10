export interface PdfBatchLimits {
  maxPages: number;
  maxBytes: number;
  pageLimit?: number;
}

export interface PdfBatch {
  data: Buffer;
  startPage: number;
  pageCount: number;
}

/** A PDF on local disk; its bytes are never loaded as a whole. */
export interface PdfFileRef {
  path: string;
  size: number;
}

export type PdfSource = Buffer | PdfFileRef;

export abstract class PdfBatcherPort {
  abstract split(
    source: PdfSource,
    limits: PdfBatchLimits,
  ): AsyncIterable<PdfBatch>;
  abstract pageCount(source: PdfSource): Promise<number>;
}
