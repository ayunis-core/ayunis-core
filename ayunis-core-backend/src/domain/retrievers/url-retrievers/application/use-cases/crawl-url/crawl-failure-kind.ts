import {
  FileTooLargeError,
  InvalidFileTypeError,
  TooManyPagesError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import {
  UrlRetrieverContentTooLargeError,
  UrlRetrieverHttpError,
  UrlRetrieverParsingError,
  UrlRetrieverUnsupportedContentTypeError,
} from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
import { UrlCrawlFailureKind } from 'src/domain/retrievers/url-retrievers/domain/url-crawl-result.entity';

const GONE_STATUSES = new Set([404, 410]);

/** The server answered, but the content cannot be crawled as served. */
const NOT_CRAWLABLE_AS_SERVED = [
  UrlRetrieverUnsupportedContentTypeError,
  InvalidFileTypeError,
  UrlRetrieverContentTooLargeError,
  FileTooLargeError,
  TooManyPagesError,
  UrlRetrieverParsingError,
  UnprocessableDocumentError,
];

/**
 * How a child page or PDF failed. Only a 404 or 410 shows that it is gone;
 * every other failure (any other HTTP error status, a timeout, a network
 * error, a redirect loop, a destination denied mid-crawl, an outage) is
 * transient, so a crawler blocked by a WAF or rate limiter removes nothing.
 * `null` when the content was served but cannot be crawled (unsupported type,
 * oversized, unparseable); such pages stay skipped and unreported, as before.
 */
export function crawlFailureKindOf(error: unknown): UrlCrawlFailureKind | null {
  if (
    error instanceof UrlRetrieverHttpError &&
    GONE_STATUSES.has(error.upstreamStatus)
  )
    return UrlCrawlFailureKind.GONE;
  if (NOT_CRAWLABLE_AS_SERVED.some((type) => error instanceof type))
    return null;
  return UrlCrawlFailureKind.TRANSIENT;
}
