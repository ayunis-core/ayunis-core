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
} from '../application/url-retriever.errors';

@Injectable()
export class CheerioUrlRetrieverHandler extends UrlRetrieverHandler {
  private readonly logger = new Logger(CheerioUrlRetrieverHandler.name);
  private readonly defaultTimeout: number;

  constructor(private readonly configService: ConfigService) {
    super();
    this.defaultTimeout = this.configService.get<number>('url.timeout') || 5000;
  }

  async retrieveUrl(input: UrlRetrieverInput): Promise<UrlRetrieverResult> {
    try {
      this.logger.debug(`Retrieving URL: ${input.url} with Cheerio handler`);

      // Create AbortController for timeout handling
      const timeout = input.options?.timeout || this.defaultTimeout;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Make the HTTP request with fetch
        const response = await fetch(input.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Ayunis/1.0',
          },
        });

        // Clear the timeout
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new UrlRetrieverHttpError(input.url, response.status, {
            statusText: response.statusText,
          });
        }

        // Get HTML content
        const html = await response.text();

        try {
          // Extract text content from HTML using cheerio
          const $ = cheerio.load(html);

          // Remove script and style elements that contain non-readable content
          $('script, style, meta, link').remove();

          // Get the text content
          const textContent = $('body').text();

          // Clean up the text (remove extra whitespace)
          const cleanedText = textContent.replace(/\s+/g, ' ').trim();

          return new UrlRetrieverResult(cleanedText, input.url);
        } catch (error) {
          throw new UrlRetrieverParsingError(input.url, error.message, {
            error: error.stack,
          });
        }
      } catch (error) {
        // Clear the timeout if not already cleared
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          throw new UrlRetrieverTimeoutError(input.url, timeout, {
            originalError: error.message,
          });
        }
        throw error; // Re-throw for the outer catch block
      }
    } catch (error) {
      // Log the error with appropriate details
      this.logger.error(
        `HTTP URL retrieval failed: ${error.message}`,
        error.stack,
      );

      // If error is already one of our domain errors, rethrow it
      if (error.name && error.name.startsWith('UrlRetriever')) {
        throw error;
      }

      // Otherwise wrap in a generic retrieval error
      throw new UrlRetrieverRetrievalError(`Failed to retrieve URL with HTTP`, {
        url: input.url,
        error: error.message,
        stack: error.stack,
      });
    }
  }
}
