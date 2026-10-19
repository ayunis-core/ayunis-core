import type { UUID } from 'crypto';
import type { RawUrlResponse } from './url-retriever.handler';
import type { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';

export abstract class PdfExtractionCachePort {
  abstract getOrLoad(
    orgId: UUID,
    response: RawUrlResponse,
    load: () => Promise<UrlRetrieverResult>,
  ): Promise<UrlRetrieverResult>;
}
