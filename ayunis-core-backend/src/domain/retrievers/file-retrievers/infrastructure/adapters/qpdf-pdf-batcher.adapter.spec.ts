jest.mock('os', () => {
  const actual = jest.requireActual<typeof os>('os');
  return { ...actual, tmpdir: jest.fn(actual.tmpdir) };
});

import { ConfigService } from '@nestjs/config';
import { PDFDocument } from 'pdf-lib';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import * as os from 'os';
import { join } from 'path';
import { QpdfPdfBatcherAdapter } from './qpdf-pdf-batcher.adapter';
import {
  EmptyOcrResultError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import type {
  PdfBatch,
  PdfBatchLimits,
  PdfSource,
} from 'src/domain/retrievers/file-retrievers/application/ports/pdf-batcher.port';

async function makePdf(pageCount: number): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) pdf.addPage([300 + i, 400]);
  return Buffer.from(await pdf.save());
}

describe('PDF OCR batches split by qpdf', () => {
  const batcher = new QpdfPdfBatcherAdapter(new ConfigService());
  let directory: string;
  let systemTemp: string;

  beforeEach(() => {
    const root = mkdtempSync(
      join(jest.requireActual<typeof os>('os').tmpdir(), 'qpdf-spec-'),
    );
    directory = join(root, 'staged');
    systemTemp = join(root, 'tmp');
    mkdirSync(directory);
    mkdirSync(systemTemp);
    jest.mocked(os.tmpdir).mockReturnValue(systemTemp);
  });
  afterEach(() => {
    rmSync(join(directory, '..'), { recursive: true, force: true });
  });

  async function collect(
    source: PdfSource,
    limits: PdfBatchLimits,
    adapter = batcher,
  ): Promise<PdfBatch[]> {
    const batches: PdfBatch[] = [];
    for await (const batch of adapter.split(source, limits))
      batches.push(batch);
    return batches;
  }

  function onDisk(data: Buffer): { path: string; size: number } {
    const path = join(directory, 'document.pdf');
    writeFileSync(path, data);
    return { path, size: data.length };
  }

  it('preserves a small PDF and its document metadata when no split is needed', async () => {
    const original = await PDFDocument.load(await makePdf(2));
    original.setTitle('Council report with document metadata');
    const data = Buffer.from(await original.save());

    const batches = await collect(data, {
      maxPages: 20,
      maxBytes: data.length,
    });

    expect(batches).toHaveLength(1);
    expect(batches[0].data).toEqual(data);
    const fromDisk = await collect(onDisk(data), {
      maxPages: 20,
      maxBytes: data.length,
    });
    expect(fromDisk[0].data).toEqual(data);
  });

  it('splits a document on disk in original page order without leaving work files behind', async () => {
    const batches = await collect(onDisk(await makePdf(45)), {
      maxPages: 20,
      maxBytes: 1_000_000,
    });

    expect(batches.map((batch) => [batch.startPage, batch.pageCount])).toEqual([
      [0, 20],
      [20, 20],
      [40, 5],
    ]);
    const widths: number[] = [];
    for (const batch of batches) {
      const pdf = await PDFDocument.load(batch.data);
      widths.push(...pdf.getPages().map((page) => page.getWidth()));
    }
    expect(widths).toEqual(Array.from({ length: 45 }, (_, i) => 300 + i));
    expect(readdirSync(systemTemp)).toEqual([]);
    expect(readdirSync(directory)).toEqual(['document.pdf']);
    expect(
      readFileSync(join(directory, 'document.pdf')).length,
    ).toBeGreaterThan(0);
  });

  it('keeps the batches of a staged file next to it while splitting', async () => {
    const batches = batcher.split(onDisk(await makePdf(6)), {
      maxPages: 2,
      maxBytes: 1_000_000,
    });

    for await (const batch of batches) {
      expect(batch.pageCount).toBe(2);
      const staged = readdirSync(directory);
      expect(staged).toHaveLength(2);
      expect(staged).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^ayunis-pdf-/),
          'document.pdf',
        ]),
      );
      break;
    }

    expect(readdirSync(directory)).toEqual(['document.pdf']);
  });

  it('removes its work files when the reader stops after the first batch', async () => {
    for await (const batch of batcher.split(await makePdf(6), {
      maxPages: 2,
      maxBytes: 1_000_000,
    })) {
      expect(batch.pageCount).toBe(2);
      break;
    }

    expect(readdirSync(systemTemp)).toEqual([]);
  });

  it('hands OCR readable pages of a PDF protected with an empty password', async () => {
    // Two pages, Standard security handler V1/R2 (40-bit RC4) with empty user
    // and owner passwords: the "protected" PDF office suites produce, which
    // viewers open without asking.
    const data = readFileSync(join(__dirname, '../../testing/encrypted.pdf'));

    const batches = await collect(data, { maxPages: 20, maxBytes: 1_000_000 });

    expect(batches.map((batch) => batch.pageCount)).toEqual([2]);
    expect(batches[0].data).not.toEqual(data);
    // pdf-lib refuses an encrypted document, so loading proves it is readable.
    const readable = await PDFDocument.load(batches[0].data);
    expect(readable.getPageCount()).toBe(2);
  });

  it('reports a file qpdf cannot read as an unprocessable document', async () => {
    const broken = Buffer.from('%PDF-1.4 not really a pdf');

    await expect(
      collect(broken, { maxPages: 2, maxBytes: 100_000 }),
    ).rejects.toBeInstanceOf(UnprocessableDocumentError);
  });

  it('fails loudly, not as a bad document, when qpdf is not installed', async () => {
    const path = process.env.PATH;
    process.env.PATH = directory;
    try {
      const failure = await collect(await makePdf(3), {
        maxPages: 2,
        maxBytes: 100_000,
      }).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(Error);
      expect(failure).not.toBeInstanceOf(UnprocessableDocumentError);
      expect((failure as Error).message).toContain('qpdf is not installed');
    } finally {
      process.env.PATH = path;
    }
  });

  it('reports a PDF without pages as an empty document', async () => {
    const empty = Buffer.from(
      await (await PDFDocument.create()).save({ addDefaultPage: false }),
    );

    await expect(
      collect(empty, { maxPages: 2, maxBytes: 100_000 }),
    ).rejects.toBeInstanceOf(EmptyOcrResultError);
  });

  it('reduces the page count when encoded batch bytes exceed the cap', async () => {
    const data = await makePdf(8);
    const [onePage] = await collect(data, { maxPages: 1, maxBytes: 1_000_000 });
    const [allPages] = await collect(data, {
      maxPages: 8,
      maxBytes: 1_000_000,
      pageLimit: 8,
    });
    const cap = Math.ceil((onePage.data.length + allPages.data.length) / 2);

    const batches = await collect(onDisk(data), { maxPages: 8, maxBytes: cap });

    expect(batches.length).toBeGreaterThan(1);
    expect(batches.every((batch) => batch.data.length <= cap)).toBe(true);
    expect(batches.reduce((sum, batch) => sum + batch.pageCount, 0)).toBe(8);
  });

  it('rejects a page that cannot fit rather than looping or sending it oversized', async () => {
    await expect(
      collect(await makePdf(1), { maxPages: 20, maxBytes: 10 }),
    ).rejects.toThrow('single PDF page');
  });

  it.each([undefined, 1])(
    'rejects an over-limit original before emitting any batch, including preview %s',
    async (pageLimit) => {
      const bounded = new QpdfPdfBatcherAdapter(
        new ConfigService({ retrieval: { processingMaxPdfPages: 3 } }),
      );

      await expect(
        collect(
          await makePdf(5),
          { maxPages: 2, maxBytes: 100_000, pageLimit },
          bounded,
        ),
      ).rejects.toMatchObject({
        code: 'TOO_MANY_PAGES',
        metadata: { pageCount: 5, maxPages: 3 },
      });
    },
  );

  it('physically includes only requested preview pages', async () => {
    const batches = await collect(await makePdf(5), {
      maxPages: 2,
      maxBytes: 100_000,
      pageLimit: 3,
    });

    expect(batches.reduce((sum, batch) => sum + batch.pageCount, 0)).toBe(3);
    const last = await PDFDocument.load(batches.at(-1)!.data);
    expect(last.getPageCount()).toBe(1);
  });

  it('counts pages of a buffer and of a file without splitting', async () => {
    const data = await makePdf(7);

    expect(await batcher.pageCount(data)).toBe(7);
    expect(await batcher.pageCount(onDisk(data))).toBe(7);
  });
});
