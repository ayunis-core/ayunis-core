import type { UUID } from 'crypto';
import type { RetrieveUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.command';
import type { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';

export interface UrlRetrievalCacheKey {
  orgId: UUID;
  url: string;
  privateDestinationPolicy: RetrieveUrlCommand['privateDestinationPolicy'];
}

export abstract class UrlRetrievalCachePort {
  abstract getOrLoad(
    key: UrlRetrievalCacheKey,
    load: () => Promise<UrlRetrieverResult>,
  ): Promise<UrlRetrieverResult>;
}
