import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import pLimit from 'p-limit';
import { assertProcessingActive } from 'src/common/types/processing-context';
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
  private readonly maxPages: number;
  private readonly maxBytes: number;
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
    this.limit = pLimit(positive(config.get('retrieval.ocrConcurrency', 4)));
  }

  async processFile(
    file: File,
    options: FileRetrieverProcessOptions = {},
  ): Promise<FileRetrieverResult> {
    const identity =
      options.cacheIdentity ??
      createHash('sha256').update(file.fileData).digest('hex');
    const pages: FileRetrieverPage[] = [];
    const limits = {
      maxPages: this.maxPages,
      maxBytes: this.maxBytes,
      pageLimit: options.pageLimit,
    };
    for await (const batch of this.batcher.split(file.fileData, limits)) {
      const result = await this.processBatch(file, batch, identity, options);
      pages.push(
        ...result.pages.map(
          (page) =>
            new FileRetrieverPage(
              page.text,
              batch.startPage + page.number,
              page.metadata,
            ),
        ),
      );
      await options.context?.progress(pages.length);
    }
    return new FileRetrieverResult(pages, { batched: true });
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
    if (saved !== undefined)
      return validateResult(JSON.parse(saved) as unknown, batch.pageCount);
    const result = await this.limit(async () => {
      await assertProcessingActive(options.context);
      return this.ocr.processFile(
        new File(batch.data, file.filename, file.fileType),
      );
    });
    const normalized = validateResult(result, batch.pageCount);
    await options.context?.write(key, JSON.stringify(normalized));
    return normalized;
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
    throw new Error('OCR batch did not return every page');
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
      throw new Error('Invalid OCR batch page order');
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
    throw new Error('Invalid OCR batch page metadata');
  return value as Record<string, unknown>;
}
