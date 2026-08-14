import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(StaanInternetSearchHandler.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {}

  async search(query: string): Promise<InternetSearchResult[]> {
    this.logger.debug({ input: query }, 'Using Staan internet search handler');

    const response = await fetch(...this.buildRequest(query));

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

  private buildRequest(query: string): [string, RequestInit] {
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
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    };
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
