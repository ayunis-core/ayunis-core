import { Injectable, Logger } from '@nestjs/common';
import { createHash, type UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { PdfExtractionCachePort } from 'src/domain/retrievers/url-retrievers/application/ports/pdf-extraction-cache.port';
import type { RawUrlResponse } from 'src/domain/retrievers/url-retrievers/application/ports/url-retriever.handler';
import type { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';

type Entries = Map<string, Promise<UrlRetrieverResult>>;
const MAX_ENTRIES = 4;
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;

@Injectable()
export class RequestPdfExtractionCacheService extends PdfExtractionCachePort {
  private readonly requests = new WeakMap<object, Entries>();
  private readonly logger = new Logger(RequestPdfExtractionCacheService.name);

  constructor(private readonly context: ContextService) {
    super();
  }

  getOrLoad(
    orgId: UUID,
    response: RawUrlResponse,
    load: () => Promise<UrlRetrieverResult>,
  ): Promise<UrlRetrieverResult> {
    if (!this.context.isActive()) return load();
    const store = this.context.get();
    const entries =
      this.requests.get(store) ??
      new Map<string, Promise<UrlRetrieverResult>>();
    this.requests.set(store, entries);
    const digest = createHash('sha256').update(response.body).digest('hex');
    const key = JSON.stringify([orgId, response.finalUrl, digest]);
    const existing = entries.get(key);
    if (existing) {
      this.logger.log('Reusing request-local PDF extraction');
      return existing;
    }
    if (entries.size >= MAX_ENTRIES) return load();

    const promise = Promise.resolve()
      .then(load)
      .then((result) => {
        if (!this.fitsCache(key, result)) entries.delete(key);
        return result;
      })
      .catch((error: unknown) => {
        entries.delete(key);
        throw error;
      });
    entries.set(key, promise);
    return promise;
  }

  private fitsCache(key: string, result: UrlRetrieverResult): boolean {
    try {
      return (
        Buffer.byteLength(key) + Buffer.byteLength(JSON.stringify(result)) <=
        MAX_ENTRY_BYTES
      );
    } catch {
      return false;
    }
  }
}
