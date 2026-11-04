import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFDocument } from 'pdf-lib';
import {
  PdfBatcherPort,
  type PdfBatch,
  type PdfBatchLimits,
} from 'src/domain/retrievers/file-retrievers/application/ports/pdf-batcher.port';
import {
  PdfBatchTooLargeError,
  TooManyPagesError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';

@Injectable()
export class PdfLibBatcherAdapter extends PdfBatcherPort {
  private readonly maxDocumentPages: number;

  constructor(config: ConfigService) {
    super();
    this.maxDocumentPages = config.get<number>(
      'retrieval.processingMaxPdfPages',
      1000,
    );
    if (
      !Number.isSafeInteger(this.maxDocumentPages) ||
      this.maxDocumentPages < 1
    )
      throw new Error('Invalid PDF document page limit');
  }

  async *split(data: Buffer, limits: PdfBatchLimits): AsyncIterable<PdfBatch> {
    this.validateLimits(limits);
    const source = await this.load(data);
    const pageCount = source.getPageCount();
    if (pageCount > this.maxDocumentPages)
      throw new TooManyPagesError({
        pageCount,
        maxPages: this.maxDocumentPages,
      });
    const total = Math.min(pageCount, limits.pageLimit ?? Infinity);
    if (
      total === source.getPageCount() &&
      total <= limits.maxPages &&
      data.length <= limits.maxBytes
    ) {
      yield { data, startPage: 0, pageCount: total };
      return;
    }
    for (let start = 0; start < total;) {
      const batch = await this.fitBatch(source, start, total, limits);
      yield batch;
      start += batch.pageCount;
    }
  }

  private async load(data: Buffer): Promise<PDFDocument> {
    try {
      return await PDFDocument.load(data, { updateMetadata: false });
    } catch {
      throw new UnprocessableDocumentError('The PDF could not be split safely');
    }
  }

  private validateLimits(limits: PdfBatchLimits): void {
    const values = [limits.maxPages, limits.maxBytes, limits.pageLimit ?? 1];
    if (values.some((value) => !Number.isSafeInteger(value) || value < 1)) {
      throw new Error('PDF batch limits must be positive integers');
    }
  }

  private async fitBatch(
    source: PDFDocument,
    start: number,
    total: number,
    limits: PdfBatchLimits,
  ): Promise<PdfBatch> {
    let count = Math.min(limits.maxPages, total - start);
    while (count > 0) {
      const target = await PDFDocument.create();
      const indices = Array.from({ length: count }, (_, i) => start + i);
      const pages = await target.copyPages(source, indices);
      for (const page of pages) target.addPage(page);
      const data = Buffer.from(await target.save({ addDefaultPage: false }));
      if (data.length <= limits.maxBytes) {
        return { data, startPage: start, pageCount: count };
      }
      if (count === 1) {
        throw new PdfBatchTooLargeError();
      }
      count = Math.max(1, Math.floor(count / 2));
    }
    throw new Error('No PDF pages available');
  }
}
