import type { UrlRetrieverResult } from '../../domain/url-retriever-result.entity';

export interface UrlRetrieverInput {
  url: string;
  options?: Record<string, unknown>;
}

export abstract class UrlRetrieverHandler {
  /**
   * Retrieve content from a URL
   * @param input The URL and options for retrieval
   * @returns The retrieved content and metadata
   */
  abstract retrieveUrl(input: UrlRetrieverInput): Promise<UrlRetrieverResult>;
}
