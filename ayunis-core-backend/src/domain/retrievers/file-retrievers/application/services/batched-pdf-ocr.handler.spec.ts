import { ConfigService } from '@nestjs/config';
import { PDFDocument } from 'pdf-lib';
import { BatchedPdfOcrHandler } from './batched-pdf-ocr.handler';
import { PdfLibBatcherAdapter } from 'src/domain/retrievers/file-retrievers/infrastructure/adapters/pdf-lib-batcher.adapter';
import { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
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
        return new FileRetrieverResult(
          pdf.getPages().map(
            (page, i) =>
              new FileRetrieverPage(`Page width ${page.getWidth()}`, i + 1, {
                width: page.getWidth(),
              }),
          ),
        );
      },
    };
    const config = new ConfigService({
      retrieval: { ocrBatchPages: 2, processingMaxPdfPages },
    });
    return new BatchedPdfOcrHandler(
      new PdfLibBatcherAdapter(config),
      ocr,
      config,
    );
  }

  beforeEach(() => {
    cache.clear();
    active = true;
    requests = 0;
    failSecond = false;
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
});
