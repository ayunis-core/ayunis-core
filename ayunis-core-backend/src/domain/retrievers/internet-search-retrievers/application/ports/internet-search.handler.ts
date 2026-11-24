import type { InternetSearchResult } from 'src/domain/retrievers/internet-search-retrievers/domain/internet-search-result.entity';

export abstract class InternetSearchHandler {
  /**
   * `allowedDomains` restricts the search through the provider's own domain
   * filter; callers must still filter the results, since a provider may relax
   * or drop the restriction.
   */
  abstract search(
    query: string,
    signal?: AbortSignal,
    allowedDomains?: readonly string[],
  ): Promise<InternetSearchResult[]>;
}
