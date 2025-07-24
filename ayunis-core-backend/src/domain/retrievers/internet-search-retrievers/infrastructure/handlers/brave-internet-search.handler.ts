import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(BraveInternetSearchHandler.name);

  constructor(private readonly configService: ConfigService) {}

  async search(query: string): Promise<InternetSearchResult[]> {
    this.logger.debug('Using Brave internet search handler', {
      query,
    });
    try {
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
      const url = `${braveSearchUrl}?q=${urlFriendlyQuery}`;
      const headers = {
        'x-subscription-token': braveSearchApiKey,
        Accept: 'application/json',
      };
      const response = await fetch(url, { headers });
      const data = (await response.json()) as
        | BraveSearchResult
        | BraveSearchErrorResult;
      if ('error' in data) {
        this.logger.error('Brave search error', {
          error: data.error,
        });
        throw new Error(data.error.detail);
      }
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
      const results = [
        ...webResults.slice(0, 5),
        ...newsResults.slice(0, 5),
      ].filter((result) => result !== null);
      this.logger.debug('Processed results', {
        results,
      });
      return results;
    } catch (error) {
      this.logger.error('Error searching web', {
        error: error as Error,
      });
      throw error;
    }
  }
}
