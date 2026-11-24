import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternetSearchHandler } from 'src/domain/retrievers/internet-search-retrievers/application/ports/internet-search.handler';
import { InternetSearchResult } from 'src/domain/retrievers/internet-search-retrievers/domain/internet-search-result.entity';
import { InternetSearchResultType } from 'src/domain/retrievers/internet-search-retrievers/domain/value-objects/internet-search-result-type.enum';
import { searchRequestSignal } from './search-request-signal';

const MAX_RESULTS = 10;
// Staan rejects a longer include_domains list with a 400.
const MAX_INCLUDE_DOMAINS = 20;

type StaanSearchResult = {
  web?: {
    results: Array<{
      title: string;
      url: string;
      snippet: string;
    }>;
  };
};

@Injectable()
export class StaanInternetSearchHandler implements InternetSearchHandler {
  private readonly logger = new Logger(StaanInternetSearchHandler.name);

  constructor(private readonly configService: ConfigService) {}

  async search(
    query: string,
    signal?: AbortSignal,
    allowedDomains?: readonly string[],
  ): Promise<InternetSearchResult[]> {
    this.logger.debug({ input: query }, 'Using Staan internet search handler');

    const [url, init] = this.buildRequest(query, allowedDomains);
    const response = await fetch(url, {
      ...init,
      signal: searchRequestSignal(signal),
    });

    // fetch does not throw on HTTP error status — check explicitly.
    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(
        { status: response.status, response: detail },
        'Staan search error',
      );
      throw new Error(`Staan search failed with status ${response.status}`);
    }

    const data = (await response.json()) as StaanSearchResult;
    return this.mapResults(data);
  }

  private buildRequest(
    query: string,
    allowedDomains: readonly string[] | undefined,
  ): [string, RequestInit] {
    const apiKey = this.configService.get<string>(
      'internetSearch.staan.apiKey',
    );
    if (!apiKey) {
      throw new Error('Staan search API key is not configured');
    }
    const market =
      this.configService.get<string>('internetSearch.staan.market') || 'de-de';
    const baseUrl =
      this.configService.get<string>('internetSearch.staan.url') ||
      'https://api.staan.ai/v2/search/web';

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    };
    // Staan documents include_domains (POST only) for an application's
    // allowlist: it holds whatever the query says and, unlike site: operators,
    // does not count against the query's 400 characters. The caller filters
    // the results either way, so a list Staan would reject is left out.
    if (
      allowedDomains?.length &&
      allowedDomains.length <= MAX_INCLUDE_DOMAINS
    ) {
      const body = { q: query, market, include_domains: allowedDomains };
      return [
        baseUrl,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      ];
    }
    const url = `${baseUrl}?q=${encodeURIComponent(query)}&market=${market}`;
    return [url, { headers }];
  }

  private mapResults(data: StaanSearchResult): InternetSearchResult[] {
    return (data.web?.results ?? [])
      .filter((result) => result.title && result.url && result.snippet)
      .slice(0, MAX_RESULTS)
      .map(
        (result) =>
          new InternetSearchResult({
            type: InternetSearchResultType.WEB,
            title: result.title,
            url: result.url,
            description: result.snippet,
          }),
      );
  }
}
