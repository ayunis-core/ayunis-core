import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';
import {
  UrlRetrieverHandler,
  UrlRetrieverInput,
} from '../application/ports/url-retriever.handler';
import { UrlRetrieverResult } from '../domain/url-retriever-result.entity';
import {
  UrlRetrieverRetrievalError,
  UrlRetrieverTimeoutError,
  UrlRetrieverHttpError,
  UrlRetrieverParsingError,
  UrlRetrieverUnsupportedContentTypeError,
  UrlRetrieverError,
} from '../application/url-retriever.errors';

@Injectable()
export class CheerioUrlRetrieverHandler extends UrlRetrieverHandler {
  private readonly logger = new Logger(CheerioUrlRetrieverHandler.name);
  private readonly defaultTimeout: number;

  constructor(private readonly configService: ConfigService) {
    super();
    this.defaultTimeout = this.configService.get<number>('url.timeout') ?? 5000;
  }

  async retrieveUrl(input: UrlRetrieverInput): Promise<UrlRetrieverResult> {
    try {
      return await this.fetchAndParse(input);
    } catch (error) {
      return this.handleTopLevelError(error, input.url);
    }
  }

  private async fetchAndParse(
    input: UrlRetrieverInput,
  ): Promise<UrlRetrieverResult> {
    this.logger.debug(`Retrieving URL: ${input.url} with Cheerio handler`);

    const timeout =
      (input.options?.timeout as number | undefined) ?? this.defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(input.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Ayunis/1.0' },
      });
      clearTimeout(timeoutId);

      this.validateResponse(response, input.url);

      return this.parseHtml(await response.text(), input.url);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new UrlRetrieverTimeoutError(input.url, timeout, {
          originalError: error.message,
        });
      }
      throw error;
    }
  }

  private validateResponse(response: Response, url: string): void {
    if (!response.ok) {
      throw new UrlRetrieverHttpError(url, response.status, {
        statusText: response.statusText,
      });
    }

    const contentType =
      response.headers.get('content-type')?.toLowerCase() ?? '';
    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('xhtml')
    ) {
      throw new UrlRetrieverUnsupportedContentTypeError(
        url,
        contentType.split(';')[0].trim(),
      );
    }
  }

  private parseHtml(html: string, url: string): UrlRetrieverResult {
    try {
      const $ = cheerio.load(html);
      $('script, style, meta, link').remove();

      const textContent = $('body').text();
      const cleanedText = textContent.replace(/\s+/g, ' ').trim();
      const websiteTitle = $('title').text();

      return new UrlRetrieverResult(cleanedText, url, websiteTitle);
    } catch (error) {
      throw new UrlRetrieverParsingError(
        url,
        error instanceof Error ? error.message : 'Unknown error',
        { error: error instanceof Error ? error.stack : 'Unknown error' },
      );
    }
  }

  private handleTopLevelError(error: unknown, url: string): never {
    this.logger.error(
      `HTTP URL retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : 'Unknown error',
    );

    if (error instanceof UrlRetrieverError) {
      throw error;
    }

    throw new UrlRetrieverRetrievalError('Failed to retrieve URL with HTTP', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'Unknown error',
    });
  }
}
