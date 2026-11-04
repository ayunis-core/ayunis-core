import { ConfigService } from '@nestjs/config';
import { PDFDocument } from 'pdf-lib';
import { PdfLibBatcherAdapter } from './pdf-lib-batcher.adapter';
import {
  EmptyOcrResultError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { readFileSync } from 'fs';
import { join } from 'path';

async function makePdf(pageCount: number): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) pdf.addPage([300 + i, 400]);
  return Buffer.from(await pdf.save());
}

describe('PDF OCR batches', () => {
  const batcher = new PdfLibBatcherAdapter(new ConfigService());

  it('preserves a small PDF and its document metadata when no split is needed', async () => {
    const original = await PDFDocument.load(await makePdf(2));
    original.setTitle('Council report with document metadata');
    const data = Buffer.from(await original.save());
    const batches = [];
    for await (const batch of batcher.split(data, {
      maxPages: 20,
      maxBytes: data.length,
    }))
      batches.push(batch);
    expect(batches).toHaveLength(1);
    const pdf = await PDFDocument.load(batches[0].data);
    expect(pdf.getTitle()).toBe('Council report with document metadata');
    expect(batches[0].data).toEqual(data);
  });

  it('sends an encrypted PDF whole with its page count read by the local parser', async () => {
    // Two pages, Standard security handler V1/R2 (40-bit RC4) with empty user
    // and owner passwords: the "protected" PDF office suites produce, which
    // viewers open without asking. pdf-lib cannot write one.
    const data = readFileSync(join(__dirname, '../../testing/encrypted.pdf'));
    const batches = [];
    for await (const batch of batcher.split(data, {
      maxPages: 1,
      maxBytes: 10,
      pageLimit: 1,
    }))
      batches.push(batch);

    expect(batches).toEqual([{ data, startPage: 0, pageCount: 1 }]);
  });

  it('reports a page copy that pdf-lib cannot complete as an unprocessable document', async () => {
    jest
      .spyOn(PDFDocument.prototype, 'copyPages')
      .mockRejectedValueOnce(new Error('broken object stream'));
    const read = async () => {
      const batches = [];
      for await (const batch of batcher.split(await makePdf(5), {
        maxPages: 2,
        maxBytes: 100_000,
      }))
        batches.push(batch);
      return batches;
    };

    await expect(read()).rejects.toBeInstanceOf(UnprocessableDocumentError);
  });

  it('reports a PDF without pages as an empty document', async () => {
    const empty = Buffer.from(
      await (await PDFDocument.create()).save({ addDefaultPage: false }),
    );
    const read = async () => {
      const batches = [];
      for await (const batch of batcher.split(empty, {
        maxPages: 2,
        maxBytes: 100_000,
      }))
        batches.push(batch);
      return batches;
    };

    await expect(read()).rejects.toBeInstanceOf(EmptyOcrResultError);
  });

  it('creates independently readable batches in original page order', async () => {
    const batches = [];
    for await (const batch of batcher.split(await makePdf(5), {
      maxPages: 2,
      maxBytes: 100_000,
    }))
      batches.push(batch);

    expect(batches.map((batch) => batch.startPage)).toEqual([0, 2, 4]);
    const widths: number[] = [];
    for (const batch of batches) {
      const pdf = await PDFDocument.load(batch.data);
      widths.push(...pdf.getPages().map((page) => page.getWidth()));
      expect(pdf.getPageCount()).toBeLessThanOrEqual(2);
    }
    expect(widths).toEqual([300, 301, 302, 303, 304]);
  });

  it('reduces the page count when encoded batch bytes exceed the cap', async () => {
    const batches = [];
    for await (const batch of batcher.split(await makePdf(8), {
      maxPages: 8,
      maxBytes: 650,
    }))
      batches.push(batch);
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.every((batch) => batch.data.length <= 650)).toBe(true);
    expect(batches.reduce((sum, batch) => sum + batch.pageCount, 0)).toBe(8);
  });

  it('rejects a page that cannot fit rather than looping or sending it oversized', async () => {
    const collect = async () => {
      for await (const batch of batcher.split(await makePdf(1), {
        maxPages: 20,
        maxBytes: 10,
      }))
        expect(batch.data.length).toBeLessThanOrEqual(10);
    };
    await expect(collect()).rejects.toThrow('single PDF page');
  });

  it.each([undefined, 1])(
    'rejects an over-limit original before emitting any batch, including preview %s',
    async (pageLimit) => {
      const bounded = new PdfLibBatcherAdapter(
        new ConfigService({ retrieval: { processingMaxPdfPages: 3 } }),
      );
      const iterator = bounded
        .split(await makePdf(5), { maxPages: 2, maxBytes: 100_000, pageLimit })
        [Symbol.asyncIterator]();
      await expect(iterator.next()).rejects.toMatchObject({
        code: 'TOO_MANY_PAGES',
        metadata: { pageCount: 5, maxPages: 3 },
      });
    },
  );

  it('physically includes only requested preview pages', async () => {
    let pages = 0;
    for await (const batch of batcher.split(await makePdf(5), {
      maxPages: 2,
      maxBytes: 100_000,
      pageLimit: 3,
    }))
      pages += batch.pageCount;
    expect(pages).toBe(3);
  });
});
