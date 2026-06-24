import type { UrlRetrieverResult } from '../../domain/url-retriever-result.entity';

export interface UrlRetrieverInput {
  url: string;
  options?: Record<string, unknown>;
  /**
   * Invoked with the target of each HTTP redirect BEFORE it is followed. Lets
   * the org-scoped crawl gate re-assert access on the redirect destination so a
   * crawl cannot be bounced onto a host bound to another org. Throwing rejects
   * the redirect; the thrown error propagates unchanged.
   */
  onRedirect?: (url: string) => Promise<void>;
}

export abstract class UrlRetrieverHandler {
  /**
   * Retrieve content from a URL
   * @param input The URL and options for retrieval
   * @returns The retrieved content and metadata
   */
  abstract retrieveUrl(input: UrlRetrieverInput): Promise<UrlRetrieverResult>;
}
