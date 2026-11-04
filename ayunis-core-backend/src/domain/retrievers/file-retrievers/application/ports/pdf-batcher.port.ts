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

export abstract class PdfBatcherPort {
  abstract split(data: Buffer, limits: PdfBatchLimits): AsyncIterable<PdfBatch>;
}
