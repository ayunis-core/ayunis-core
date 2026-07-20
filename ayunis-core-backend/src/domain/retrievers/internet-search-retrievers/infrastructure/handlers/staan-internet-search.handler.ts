import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternetSearchHandler } from '../../application/ports/internet-search.handler';
import { InternetSearchResult } from '../../domain/internet-search-result.entity';
import { InternetSearchResultType } from '../../domain/value-objects/internet-search-result-type.enum';

const MAX_RESULTS = 10;

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

  async search(query: string): Promise<InternetSearchResult[]> {
    this.logger.debug('Using Staan internet search handler', { query });

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

    const url = `${baseUrl}?q=${encodeURIComponent(query)}&market=${market}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    // fetch does not throw on HTTP error status — check explicitly.
    if (!response.ok) {
      const detail = await response.text();
      this.logger.error('Staan search error', {
        status: response.status,
        detail,
      });
      throw new Error(`Staan search failed with status ${response.status}`);
    }

    const data = (await response.json()) as StaanSearchResult;
    return this.mapResults(data);
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
