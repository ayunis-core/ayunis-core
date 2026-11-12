import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import pLimit from 'p-limit';
import { assertProcessingActive } from 'src/common/types/processing-context';
import { UnprocessableDocumentError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import {
  FileRetrieverHandler,
  PdfOcrRequestPort,
  type FileRetrieverProcessOptions,
} from 'src/domain/retrievers/file-retrievers/application/ports/file-retriever.handler';
import {
  PdfBatcherPort,
  type PdfBatch,
} from 'src/domain/retrievers/file-retrievers/application/ports/pdf-batcher.port';
import { File } from 'src/domain/retrievers/file-retrievers/domain/file.entity';
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';

@Injectable()
export class BatchedPdfOcrHandler extends FileRetrieverHandler {
  private readonly logger = new Logger(BatchedPdfOcrHandler.name);
  private readonly maxPages: number;
  private readonly maxBytes: number;
  private readonly concurrency: number;
  private readonly limit: ReturnType<typeof pLimit>;

  constructor(
    private readonly batcher: PdfBatcherPort,
    private readonly ocr: PdfOcrRequestPort,
    config: ConfigService,
  ) {
    super();
    this.maxPages = positive(config.get('retrieval.ocrBatchPages', 20));
    this.maxBytes = positive(
      config.get('retrieval.ocrBatchBytes', 10 * 1024 * 1024),
    );
    this.concurrency = positive(config.get('retrieval.ocrConcurrency', 4));
    this.limit = pLimit(this.concurrency);
  }

  async processFile(
    file: File,
    options: FileRetrieverProcessOptions = {},
  ): Promise<FileRetrieverResult> {
    const identity =
      options.cacheIdentity ??
      file.local?.sha256 ??
      createHash('sha256').update(file.fileData).digest('hex');
    const batches = this.batcher.split(file.local ?? file.fileData, {
      maxPages: this.maxPages,
      maxBytes: this.maxBytes,
      pageLimit: options.pageLimit,
    });
    const done: Array<{ startPage: number; pages: FileRetrieverPage[] }> = [];
    let completedPages = 0;
    await this.inParallel(batches, async (batch) => {
      const result = await this.processBatch(file, batch, identity, options);
      done.push({ startPage: batch.startPage, pages: result.pages });
      completedPages += batch.pageCount;
      await options.context?.progress(completedPages);
    });
    done.sort((a, b) => a.startPage - b.startPage);
    const pages = done.flatMap((batch) =>
      batch.pages.map(
        (page) =>
          new FileRetrieverPage(
            page.text,
            batch.startPage + page.number,
            page.metadata,
          ),
      ),
    );
    return new FileRetrieverResult(pages, { batched: true });
  }

  // A document may fill every OCR slot of the process, but it never has more
  // batches waiting or running than there are slots: the next one is split
  // off only when one finishes. That bounds the batch bytes held per document
  // and lets another document's batch in after one of these, not after all.
  // After a failure nothing new starts; the batches already sent are awaited
  // so their results are saved for the retry.
  private async inParallel(
    batches: AsyncIterable<PdfBatch>,
    work: (batch: PdfBatch) => Promise<void>,
  ): Promise<void> {
    const running = new Set<Promise<void>>();
    const failures: unknown[] = [];
    try {
      for await (const batch of batches) {
        const task: Promise<void> = work(batch)
          .catch((error: unknown) => {
            failures.push(error);
          })
          .finally(() => running.delete(task));
        running.add(task);
        if (running.size >= this.concurrency) await Promise.race(running);
        if (failures.length > 0) break;
      }
    } finally {
      await Promise.all(running);
    }
    if (failures.length > 0) throw failures[0];
  }

  private async processBatch(
    file: File,
    batch: PdfBatch,
    identity: string,
    options: FileRetrieverProcessOptions,
  ): Promise<FileRetrieverResult> {
    const key = createHash('sha256')
      .update(`ocr-v1:${identity}:${batch.startPage}:${batch.pageCount}`)
      .digest('hex');
    const saved = await options.context?.read(key);
    const restored =
      saved === undefined ? null : this.restore(saved, batch.pageCount);
    if (restored) return restored;
    const result = await this.limit(async () => {
      await assertProcessingActive(options.context);
      return this.ocr.processFile(
        new File(batch.data, file.filename, file.fileType),
        { pageLimit: batch.pageCount },
      );
    });
    const normalized = validateResult(result, batch.pageCount);
    await options.context?.write(key, JSON.stringify(normalized));
    return normalized;
  }

  // The checkpoint was written and validated by this handler; one that no
  // longer reads is a storage glitch, not a reason to fail the source on
  // every retry, so it counts as absent and the batch is redone.
  private restore(saved: string, count: number): FileRetrieverResult | null {
    try {
      return validateResult(JSON.parse(saved) as unknown, count);
    } catch (error) {
      this.logger.warn(
        { err: error as Error },
        'Ignoring an unreadable OCR checkpoint',
      );
      return null;
    }
  }
}

function positive(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error('Invalid OCR batch configuration');
  return value;
}

function validateResult(result: unknown, count: number): FileRetrieverResult {
  if (
    typeof result !== 'object' ||
    result === null ||
    !('pages' in result) ||
    !Array.isArray(result.pages) ||
    result.pages.length !== count
  ) {
    throw new UnprocessableDocumentError(
      'OCR batch did not return every page',
      { expectedPages: count },
    );
  }
  const pages = result.pages.map((page: unknown, index: number) => {
    if (
      typeof page !== 'object' ||
      page === null ||
      !('text' in page) ||
      typeof page.text !== 'string' ||
      !('number' in page) ||
      page.number !== index + 1
    ) {
      throw new UnprocessableDocumentError('Invalid OCR batch page order');
    }
    return new FileRetrieverPage(
      page.text,
      page.number,
      pageMetadata('metadata' in page ? page.metadata : undefined),
    );
  });
  return new FileRetrieverResult(pages);
}

function pageMetadata(value: unknown): Record<string, unknown> {
  if (value === undefined) return {};
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new UnprocessableDocumentError('Invalid OCR batch page metadata');
  return value as Record<string, unknown>;
}
