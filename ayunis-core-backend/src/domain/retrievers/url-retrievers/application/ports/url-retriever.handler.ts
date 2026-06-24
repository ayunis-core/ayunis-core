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

/**
 * The raw result of fetching a URL, before any content-type-specific parsing.
 * The application layer inspects `contentType` to decide whether to parse the
 * bytes as HTML (via this handler) or hand them to the file-retrieval pipeline
 * (e.g. PDFs). This keeps the infrastructure adapter ignorant of other modules.
 */
export interface RawUrlResponse {
  /** Lowercased `content-type` header value, or `''` when none was sent. */
  contentType: string;
  /** The URL the content actually came from, after following redirects. */
  finalUrl: string;
  /** The raw response body. */
  body: Buffer;
}

export abstract class UrlRetrieverHandler {
  /**
   * Fetch a URL's raw bytes, following redirects (re-asserting the org gate on
   * each hop via `input.onRedirect`). Throws domain errors for HTTP failures,
   * timeouts, and redirect loops. It does NOT interpret the content type — that
   * decision belongs to the application layer.
   */
  abstract fetch(input: UrlRetrieverInput): Promise<RawUrlResponse>;

  /**
   * Parse an HTML document into cleaned text, title, and discovered links.
   */
  abstract parseHtml(html: string, url: string): UrlRetrieverResult;
}
