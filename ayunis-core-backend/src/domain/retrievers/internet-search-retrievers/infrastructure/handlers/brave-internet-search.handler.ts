import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InternetSearchHandler } from '../../application/ports/internet-search.handler';
import { InternetSearchResult } from '../../domain/internet-search-result.entity';
import { ConfigService } from '@nestjs/config';
import { InternetSearchResultType } from '../../domain/value-objects/internet-search-result-type.enum';

type BraveSearchResult = {
  news?: {
    results: Array<{
      title: string;
      url: string;
      description: string;
      page_age: string; // ISO 8601 datetime string
    }>;
  };
  web?: {
    results: Array<{
      title: string;
      url: string;
      description: string;
    }>;
  };
};

type BraveSearchErrorResult = {
  error: {
    code: string;
    detail: string;
  };
};

@Injectable()
export class BraveInternetSearchHandler implements InternetSearchHandler {
  constructor(
    @InjectPinoLogger(BraveInternetSearchHandler.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {}

  async search(query: string): Promise<InternetSearchResult[]> {
    this.logger.debug({ input: query }, 'Using Brave internet search handler');
    try {
      const response = await fetch(...this.buildRequest(query));
      const data = (await response.json()) as
        BraveSearchResult | BraveSearchErrorResult;
      if ('error' in data) {
        this.logger.error({ response: data.error }, 'Brave search error');
        throw new Error(data.error.detail);
      }
      const results = this.mapResults(data);
      this.logger.debug(
        { resultCount: results.length },
        'Processed search results',
      );
      return results;
    } catch (error) {
      this.logger.error({ err: error as Error }, 'Error searching web');
      throw error;
    }
  }

  private buildRequest(query: string): [string, RequestInit] {
    const braveSearchUrl = this.configService.get<string>(
      'internetSearch.brave.url',
    );
    const braveSearchApiKey = this.configService.get<string>(
      'internetSearch.brave.apiKey',
    );
    if (!braveSearchUrl || !braveSearchApiKey) {
      throw new Error('Brave search URL or API key is not configured');
    }

    const urlFriendlyQuery = encodeURI(query);
    const headers = {
      'x-subscription-token': braveSearchApiKey,
      Accept: 'application/json',
    };
    return [`${braveSearchUrl}?q=${urlFriendlyQuery}`, { headers }];
  }

  /** Top 5 web and top 5 news hits, skipping entries with missing fields. */
  private mapResults(data: BraveSearchResult): InternetSearchResult[] {
    const webResults =
      data.web?.results.map((result) => {
        if (result.title && result.url && result.description) {
          return new InternetSearchResult({
            type: InternetSearchResultType.WEB,
            title: result.title,
            url: result.url,
            description: result.description,
          });
        }
        return null;
      }) ?? [];
    const newsResults =
      data.news?.results.map((result) => {
        if (result.title && result.url && result.description) {
          return new InternetSearchResult({
            type: InternetSearchResultType.NEWS,
            title: result.title,
            url: result.url,
            description: result.description,
            pageAge: result.page_age,
          });
        }
        return null;
      }) ?? [];
    return [...webResults.slice(0, 5), ...newsResults.slice(0, 5)].filter(
      (result) => result !== null,
    );
  }
}
