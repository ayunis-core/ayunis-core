import { Injectable, Logger } from '@nestjs/common';
import { createHash, type UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { PdfExtractionCachePort } from 'src/domain/retrievers/url-retrievers/application/ports/pdf-extraction-cache.port';
import type { RawUrlResponse } from 'src/domain/retrievers/url-retrievers/application/ports/url-retriever.handler';
import type { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';
import { RequestScopedResultCache } from './request-scoped-result-cache';

@Injectable()
export class RequestPdfExtractionCacheService extends PdfExtractionCachePort {
  private readonly cache: RequestScopedResultCache;
  private readonly logger = new Logger(RequestPdfExtractionCacheService.name);

  constructor(context: ContextService) {
    super();
    this.cache = new RequestScopedResultCache(context, {
      maxEntries: 4,
      maxEntryBytes: 2 * 1024 * 1024,
    });
  }

  getOrLoad(
    orgId: UUID,
    response: RawUrlResponse,
    load: () => Promise<UrlRetrieverResult>,
  ): Promise<UrlRetrieverResult> {
    const digest = createHash('sha256').update(response.body).digest('hex');
    const key = JSON.stringify([orgId, response.finalUrl, digest]);
    if (this.cache.has(key)) {
      this.logger.log('Reusing request-local PDF extraction');
    }
    return this.cache.getOrLoad(key, load);
  }
}
