import { ConfigService } from '@nestjs/config';
import { PDFDocument } from 'pdf-lib';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BatchedPdfOcrHandler } from './batched-pdf-ocr.handler';
import { QpdfPdfBatcherAdapter } from 'src/domain/retrievers/file-retrievers/infrastructure/adapters/qpdf-pdf-batcher.adapter';
import { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import { UnprocessableDocumentError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import type { PdfBatcherPort } from 'src/domain/retrievers/file-retrievers/application/ports/pdf-batcher.port';
import { ProcessingStoppedError } from 'src/common/types/processing-context';
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';

async function recordingPdf(): Promise<File> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 5; i++) pdf.addPage([300 + i, 400]);
  return new File(
    Buffer.from(await pdf.save()),
    'council-report.pdf',
    'application/pdf',
  );
}

describe('batched PDF OCR', () => {
  const cache = new Map<string, string>();
  let active: boolean;
  let requests: number;
  let failSecond: boolean;
  let dropLastPage: boolean;
  const context = {
    read: async (key: string) => cache.get(key),
    write: async (key: string, value: string) => {
      cache.set(key, value);
    },
    isActive: async () => active,
    progress: () => Promise.resolve(),
  };

  function handler(processingMaxPdfPages = 1000) {
    const ocr = {
      processFile: async (file: File) => {
        requests++;
        if (failSecond && requests === 2) throw new Error('provider timeout');
        const pdf = await PDFDocument.load(file.fileData);
        const pages = pdf.getPages().map(
          (page, i) =>
            new FileRetrieverPage(`Page width ${page.getWidth()}`, i + 1, {
              width: page.getWidth(),
            }),
        );
        return new FileRetrieverResult(
          dropLastPage ? pages.slice(0, -1) : pages,
        );
      },
    };
    const config = new ConfigService({
      retrieval: { ocrBatchPages: 2, processingMaxPdfPages },
    });
    return new BatchedPdfOcrHandler(
      new QpdfPdfBatcherAdapter(config),
      ocr,
      config,
    );
  }

  beforeEach(() => {
    cache.clear();
    active = true;
    requests = 0;
    failSecond = false;
    dropLastPage = false;
  });

  it('redoes a batch whose saved checkpoint no longer reads', async () => {
    const file = await recordingPdf();
    await handler().processFile(file, { context });
    expect(requests).toBe(3);
    for (const key of cache.keys()) cache.set(key, '{');

    const result = await handler().processFile(file, { context });

    expect(requests).toBe(6);
    expect(result.pages.map((page) => page.number)).toEqual([1, 2, 3, 4, 5]);
    for (const value of cache.values()) {
      expect(() => JSON.parse(value)).not.toThrow();
    }
  });

  it('reports a short OCR result as an unprocessable document', async () => {
    dropLastPage = true;
    await expect(
      handler().processFile(await recordingPdf(), { context }),
    ).rejects.toBeInstanceOf(UnprocessableDocumentError);
  });

  it('sends smaller PDFs and restores original page numbers', async () => {
    const result = await handler().processFile(await recordingPdf());
    expect(requests).toBe(3);
    expect(result.pages.map((page) => page.number)).toEqual([1, 2, 3, 4, 5]);
    expect(result.pages[4].text).toBe('Page width 304');
  });

  it('reuses saved batches after failure and a new handler instance', async () => {
    const file = await recordingPdf();
    failSecond = true;
    await expect(handler().processFile(file, { context })).rejects.toThrow(
      'provider timeout',
    );
    failSecond = false;
    const result = await handler().processFile(file, { context });
    expect(requests).toBe(4);
    expect(result.pages).toHaveLength(5);
  });

  it('returns the same page metadata from fresh and restored results', async () => {
    const file = await recordingPdf();
    const fresh = await handler().processFile(file, { context });
    const restored = await handler().processFile(file, { context });
    expect(fresh.pages[0].metadata).toEqual({ width: 300 });
    expect(restored).toEqual(fresh);
    expect(requests).toBe(3);
  });

  it('enforces the original page cap even when no legacy preflight counted pages', async () => {
    await expect(
      handler(3).processFile(await recordingPdf(), { context }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_PAGES' });
    expect(requests).toBe(0);
    expect(cache.size).toBe(0);
  });

  it('does not call OCR after the source has been canceled or deleted', async () => {
    active = false;
    await expect(
      handler().processFile(await recordingPdf(), { context }),
    ).rejects.toThrow('no longer active');
    expect(requests).toBe(0);
    expect(cache.size).toBe(0);
  });

  it('reads a PDF kept on disk and keys its checkpoints by the staged hash, not the path', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'batched-ocr-spec-'));
    try {
      const { fileData } = await recordingPdf();
      const staged = (name: string) => {
        const path = join(directory, name);
        writeFileSync(path, fileData);
        return new File(
          Buffer.alloc(0),
          'council-report.pdf',
          'application/pdf',
          {
            path,
            size: fileData.length,
            sha256: 'hash-taken-while-staging',
          },
        );
      };

      const first = await handler().processFile(staged('first'), { context });

      expect(first.pages.map((page) => page.number)).toEqual([1, 2, 3, 4, 5]);
      expect(first.pages.map((page) => page.text)).toEqual([
        'Page width 300',
        'Page width 301',
        'Page width 302',
        'Page width 303',
        'Page width 304',
      ]);
      expect(requests).toBe(3);

      // A retry stages the same bytes under another path and reuses every batch.
      await handler().processFile(staged('retry'), { context });
      expect(requests).toBe(3);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe('batched PDF OCR across several batches', () => {
  const PAGES_PER_BATCH = 2;
  const cache = new Map<string, string>();
  let active: boolean;
  let started: number[];
  let running: number;
  let mostRunning: number;
  let produced: number;
  let finished: number;
  let mostHeld: number;
  let secondsFor: (batch: number) => number;
  let failing: Set<number>;
  let progress: number[];
  const context = {
    read: async (key: string) => cache.get(key),
    write: async (key: string, value: string) => {
      cache.set(key, value);
    },
    isActive: async () => active,
    progress: async (completed: number) => {
      progress.push(completed);
    },
  };

  // The document's bytes name its number of batches; a batch's bytes name its
  // position, so the OCR double knows which batch it was handed.
  function pdfOf(batches: number): File {
    return new File(
      Buffer.from(String(batches)),
      'council-minutes.pdf',
      'application/pdf',
    );
  }

  const batcher: PdfBatcherPort = {
    pageCount: async (source) =>
      Number((source as Buffer).toString()) * PAGES_PER_BATCH,
    async *split(source) {
      const batches = Number((source as Buffer).toString());
      for (let batch = 0; batch < batches; batch++) {
        produced++;
        mostHeld = Math.max(mostHeld, produced - finished);
        yield {
          data: Buffer.from(String(batch)),
          startPage: batch * PAGES_PER_BATCH,
          pageCount: PAGES_PER_BATCH,
        };
      }
    },
  };

  const ocr = {
    processFile: async (file: File) => {
      const batch = Number(file.fileData.toString());
      started.push(batch);
      mostRunning = Math.max(mostRunning, ++running);
      try {
        await new Promise((resolve) =>
          setTimeout(resolve, secondsFor(batch) * 1000),
        );
        if (failing.has(batch)) throw new Error('provider timeout');
        return new FileRetrieverResult(
          Array.from(
            { length: PAGES_PER_BATCH },
            (_, page) =>
              new FileRetrieverPage(
                `batch ${batch} page ${page + 1}`,
                page + 1,
              ),
          ),
        );
      } finally {
        running--;
        finished++;
      }
    },
  };

  function handler(ocrConcurrency = 4) {
    return new BatchedPdfOcrHandler(
      batcher,
      ocr,
      new ConfigService({ retrieval: { ocrConcurrency } }),
    );
  }

  // Resolves with the seconds of fake time the work took, however it ended.
  function timed<T>(work: Promise<T>) {
    const startedAt = Date.now();
    const seconds = () => (Date.now() - startedAt) / 1000;
    return work.then(
      (result) => ({ result, error: undefined, seconds: seconds() }),
      (error: unknown) => ({ result: undefined, error, seconds: seconds() }),
    );
  }

  beforeEach(() => {
    jest.useFakeTimers();
    cache.clear();
    active = true;
    started = [];
    running = 0;
    mostRunning = 0;
    produced = 0;
    finished = 0;
    mostHeld = 0;
    secondsFor = () => 1;
    failing = new Set();
    progress = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('finishes in the time of its slowest batch instead of the sum of all batches', async () => {
    secondsFor = (batch) => (batch === 0 ? 4 : 1);

    const work = timed(handler().processFile(pdfOf(8)));
    await jest.runAllTimersAsync();

    expect((await work).seconds).toBe(4);
  });

  it('keeps the pages in document order when later batches answer first', async () => {
    secondsFor = (batch) => 8 - batch;

    const work = timed(handler().processFile(pdfOf(8)));
    await jest.runAllTimersAsync();
    const { result } = await work;

    expect(result?.pages.map((page) => page.number)).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 1),
    );
    expect(result?.pages.map((page) => page.text)).toEqual(
      Array.from(
        { length: 16 },
        (_, index) => `batch ${Math.floor(index / 2)} page ${(index % 2) + 1}`,
      ),
    );
  });

  it('never runs more OCR requests at once than the process limit, across documents', async () => {
    const shared = handler(4);

    const work = Promise.all([
      shared.processFile(pdfOf(8)),
      shared.processFile(pdfOf(8)),
      shared.processFile(pdfOf(1)),
    ]);
    await jest.runAllTimersAsync();
    await work;

    expect(mostRunning).toBe(4);
  });

  it('holds no more batches of a document in memory than it may send at once', async () => {
    const work = handler(2).processFile(pdfOf(10));
    await jest.runAllTimersAsync();
    await work;

    expect(mostHeld).toBe(2);
  });

  it('lets another document in after one batch, not after the whole long document', async () => {
    const shared = handler(4);

    const long = timed(shared.processFile(pdfOf(12)));
    await jest.advanceTimersByTimeAsync(100);
    const short = timed(shared.processFile(pdfOf(1)));
    await jest.runAllTimersAsync();

    expect((await short).seconds).toBeCloseTo(1.9);
    expect((await long).seconds).toBe(4);
  });

  it('starts no further batch after one fails and keeps the ones still running for the retry', async () => {
    secondsFor = (batch) => (batch === 1 ? 0.5 : 1);
    failing = new Set([1]);
    const file = pdfOf(6);

    const failed = timed(handler(2).processFile(file, { context }));
    await jest.runAllTimersAsync();

    expect((await failed).error).toEqual(new Error('provider timeout'));
    expect(started).toEqual([0, 1]);
    expect(running).toBe(0);

    failing = new Set();
    const retried = timed(handler(2).processFile(file, { context }));
    await jest.runAllTimersAsync();

    expect((await retried).result?.pages).toHaveLength(12);
    expect(started).toEqual([0, 1, 1, 2, 3, 4, 5]);
  });

  it('calls OCR for no further batch once the source is cancelled mid-document', async () => {
    const work = timed(handler(2).processFile(pdfOf(6), { context }));
    await jest.advanceTimersByTimeAsync(500);
    active = false;
    await jest.runAllTimersAsync();

    expect((await work).error).toBeInstanceOf(ProcessingStoppedError);
    expect(started).toEqual([0, 1]);
  });

  it('reports the pages completed so far each time a batch finishes', async () => {
    const work = handler(2).processFile(pdfOf(3), { context });
    await jest.runAllTimersAsync();
    await work;

    expect(progress).toEqual([2, 4, 6]);
  });
});
