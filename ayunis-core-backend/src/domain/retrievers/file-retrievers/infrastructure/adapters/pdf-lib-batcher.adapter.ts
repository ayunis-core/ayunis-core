import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFDocument } from 'pdf-lib';
import PdfParse from 'pdf-parse';
import {
  PdfBatcherPort,
  type PdfBatch,
  type PdfBatchLimits,
} from 'src/domain/retrievers/file-retrievers/application/ports/pdf-batcher.port';
import {
  EmptyOcrResultError,
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
    const pageCount = source.isEncrypted
      ? await this.countEncryptedPages(data)
      : this.pageCount(source);
    if (pageCount > this.maxDocumentPages)
      throw new TooManyPagesError({
        pageCount,
        maxPages: this.maxDocumentPages,
      });
    // Nothing to send: the OCR provider would answer an empty result for the
    // whole file, and an oversized empty file would otherwise yield no batch
    // at all and index as an empty, ready source.
    if (pageCount === 0) throw new EmptyOcrResultError({ pageCount });
    const total = Math.min(pageCount, limits.pageLimit ?? Infinity);
    // Pages copied out of an encrypted document keep their ciphered streams,
    // so such a document goes to OCR whole, as it did before batching; the
    // OCR request carries the page limit instead.
    const whole =
      source.isEncrypted ||
      (total === pageCount &&
        total <= limits.maxPages &&
        data.length <= limits.maxBytes);
    if (whole) {
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
      return await PDFDocument.load(data, {
        updateMetadata: false,
        ignoreEncryption: true,
      });
    } catch {
      throw new UnprocessableDocumentError('The PDF could not be split safely');
    }
  }

  private pageCount(source: PDFDocument): number {
    try {
      return source.getPageCount();
    } catch {
      throw new UnprocessableDocumentError('The PDF could not be split safely');
    }
  }

  // pdf-lib cannot walk the page tree of an encrypted document when it sits in
  // an object stream; pdf.js reads the metadata of either layout.
  private async countEncryptedPages(data: Buffer): Promise<number> {
    try {
      const parse = PdfParse as (
        data: Uint8Array,
        options: PdfParse.Options,
      ) => Promise<PdfParse.Result>;
      const parsed = await parse(new Uint8Array(data), { max: 1 });
      return parsed.numpages;
    } catch {
      throw new UnprocessableDocumentError(
        'The encrypted PDF could not be read',
      );
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
      const data = await this.copyPages(source, start, count);
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

  private async copyPages(
    source: PDFDocument,
    start: number,
    count: number,
  ): Promise<Buffer> {
    try {
      const target = await PDFDocument.create();
      const indices = Array.from({ length: count }, (_, i) => start + i);
      const pages = await target.copyPages(source, indices);
      for (const page of pages) target.addPage(page);
      return Buffer.from(await target.save({ addDefaultPage: false }));
    } catch {
      throw new UnprocessableDocumentError('The PDF could not be split safely');
    }
  }
}
