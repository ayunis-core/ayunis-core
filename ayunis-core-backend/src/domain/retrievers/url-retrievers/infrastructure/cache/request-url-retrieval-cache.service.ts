import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import {
  UrlRetrievalCachePort,
  type UrlRetrievalCacheKey,
} from 'src/domain/retrievers/url-retrievers/application/ports/url-retrieval-cache.port';
import type { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';
import { RequestScopedResultCache } from './request-scoped-result-cache';

@Injectable()
export class RequestUrlRetrievalCacheService extends UrlRetrievalCachePort {
  private readonly cache: RequestScopedResultCache;
  private readonly logger = new Logger(RequestUrlRetrievalCacheService.name);

  constructor(context: ContextService) {
    super();
    this.cache = new RequestScopedResultCache(context, {
      maxEntries: 12,
      maxEntryBytes: 2 * 1024 * 1024,
    });
  }

  getOrLoad(
    key: UrlRetrievalCacheKey,
    load: () => Promise<UrlRetrieverResult>,
  ): Promise<UrlRetrieverResult> {
    const cacheKey = JSON.stringify([
      key.orgId,
      key.url,
      key.privateDestinationPolicy,
    ]);
    if (this.cache.has(cacheKey)) {
      this.logger.log('Reusing request-local URL retrieval');
    }
    return this.cache.getOrLoad(cacheKey, load);
  }
}
