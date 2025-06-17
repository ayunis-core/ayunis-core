import { Injectable } from '@nestjs/common';
import { InternetSearchHandler } from '../../application/ports/internet-search.handler';
import { InternetSearchResult } from '../../domain/internet-search-result.entity';
import { ConfigService } from '@nestjs/config';

type BraveSearchResult = {
  web: {
    results: Array<{
      title: string;
      url: string;
      description: string;
    }>;
  };
};

@Injectable()
export class BraveInternetSearchHandler implements InternetSearchHandler {
  private readonly braveSearchUrl: string | undefined;
  private readonly braveSearchApiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.braveSearchUrl = this.configService.get<string>(
      'internetSearch.brave.url',
    );
    this.braveSearchApiKey = this.configService.get<string>(
      'internetSearch.brave.apiKey',
    );
  }

  async search(query: string): Promise<InternetSearchResult[]> {
    if (!this.braveSearchUrl || !this.braveSearchApiKey) {
      throw new Error('Brave search URL or API key is not configured');
    }

    const urlFriendlyQuery = encodeURIComponent(query);
    const url = `${this.braveSearchUrl}?q=${urlFriendlyQuery}`;
    const headers = {
      'X-API-Key': this.braveSearchApiKey,
    };
    const response = await fetch(url, { headers });
    const data = (await response.json()) as BraveSearchResult;
    const results = data.web.results.map((result) => {
      if (result.title && result.url && result.description) {
        return new InternetSearchResult(
          result.title,
          result.url,
          result.description,
        );
      }
      return null;
    });

    return results.filter((result) => result !== null);
  }
}
