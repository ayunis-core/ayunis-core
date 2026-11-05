import type { InternetSearchResult } from 'src/domain/retrievers/internet-search-retrievers/domain/internet-search-result.entity';

export abstract class InternetSearchHandler {
  abstract search(
    query: string,
    signal?: AbortSignal,
  ): Promise<InternetSearchResult[]>;
}
