import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { extname } from 'path';
import { Readable } from 'stream';
import type { ApplicationError } from 'src/common/errors/base.error';
import { CrawlDomainAccessDeniedError } from 'src/domain/crawl-domain-grants/application/crawl-domain-grants.errors';
import {
  FileTooLargeError,
  InvalidFileTypeError,
  TooManyPagesError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { CrawlUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/crawl-url/crawl-url.command';
import { CrawlUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/crawl-url/crawl-url.use-case';
import { DownloadPdfCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/download-pdf/download-pdf.command';
import { DownloadPdfUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/download-pdf/download-pdf.use-case';
import { RetrieveUrlCommand } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.command';
import { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import {
  UnexpectedUrlRetrieverError,
  UrlRetrieverContentTooLargeError,
  UrlRetrieverError,
  UrlRetrieverHttpError,
  UrlRetrieverProviderNotAvailableError,
  UrlRetrieverUnsupportedContentTypeError,
} from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
import {
  UrlCrawlFailureKind,
  type UrlCrawlPage,
  type UrlCrawlPdf,
  type UrlCrawlResult,
} from 'src/domain/retrievers/url-retrievers/domain/url-crawl-result.entity';
import {
  SyncSourceOutcome,
  type SyncChangesResult,
  type SyncItem,
  type SyncItemContentResult,
} from 'src/domain/knowledge-base-sync/application/models/sync-source-results';
import { SyncSource } from 'src/domain/knowledge-base-sync/application/ports/sync-source.port';
import type { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import type { WebSyncedLocation } from 'src/domain/knowledge-base-sync/domain/web-synced-location.entity';

const GONE_STATUSES = new Set([404, 410]);
const PDF_EXTENSION = '.pdf';

/**
 * Websites, through the URL crawler (`domain/retrievers/url-retrievers`).
 * Every listing is a full crawl to the location's depth without the page
 * and PDF caps; a file is a page or a linked PDF, identified by its URL
 * (`itemIdOf`) and read from the URL it was served from. A page's version
 * is a hash of its extracted text, which is also its content; a PDF's is
 * the crawler's (validator headers, else a hash of the download), and its
 * content the PDF as served.
 */
@Injectable()
export class WebSyncSource extends SyncSource<WebSyncedLocation> {
  private readonly logger = new Logger(WebSyncSource.name);

  constructor(
    private readonly crawlUrl: CrawlUrlUseCase,
    private readonly retrieveUrl: RetrieveUrlUseCase,
    private readonly downloadPdf: DownloadPdfUseCase,
  ) {
    super();
  }

  async listChanges(location: WebSyncedLocation): Promise<SyncChangesResult> {
    let crawl: UrlCrawlResult;
    try {
      crawl = await this.crawlUrl.execute(
        new CrawlUrlCommand(location.location, location.orgId, location.depth, {
          liftCaps: true,
          resolvePdfVersions: true,
        }),
      );
    } catch (error) {
      // An unreachable root fails the sync, which removes nothing. Any other
      // failure is ours, not the website's, and fails the run instead.
      if (!isWebsiteFailure(error)) throw error;
      this.logger.warn(
        { locationId: location.id, errorCode: error.code },
        'Website not reachable',
      );
      return { outcome: SyncSourceOutcome.ACCESS_LOST };
    }
    return {
      outcome: SyncSourceOutcome.CHANGES,
      items: [...crawl.pages.map(pageItem), ...crawl.pdfLinks.flatMap(pdfItem)],
      removedItemIds: [],
      // A gone page or PDF is just not listed, and so removed.
      keptItemIds: crawl.failures
        .filter(({ kind }) => kind === UrlCrawlFailureKind.TRANSIENT)
        .map(({ url }) => itemIdOf(url)),
      cursor: '',
      fullListing: true,
    };
  }

  /**
   * Fails, to be retried, when the page or PDF cannot be read for a
   * reason that may pass; its document keeps the version it has.
   */
  async fetchItemContent(
    location: WebSyncedLocation,
    file: SyncedFile,
  ): Promise<SyncItemContentResult> {
    const url = file.url ?? file.externalId;
    try {
      const content = isPdf(file)
        ? await this.downloadPdf.execute(
            new DownloadPdfCommand(url, location.orgId),
          )
        : Buffer.from(
            (
              await this.retrieveUrl.execute(
                new RetrieveUrlCommand(url, location.orgId),
              )
            ).content,
          );
      return {
        outcome: SyncSourceOutcome.CONTENT,
        content: Readable.from([content]),
        size: content.length,
      };
    } catch (error) {
      const settled = settledFailure(error);
      if (settled) return settled;
      throw error;
    }
  }
}

/**
 * A page's or PDF's identity: its URL without scheme, `www.`, trailing
 * slash and fragment. The crawler lists a page under the URL it was served
 * from but reports a failure under the URL as linked, so the redirects
 * sites commonly answer (to https, to or from `www.`, to a trailing slash)
 * must not make a failed page look like a different one, whose document
 * would then be removed.
 */
function itemIdOf(url: string): string {
  const parsed = new URL(url);
  const host = parsed.host.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname.endsWith('/')
    ? parsed.pathname.slice(0, -1)
    : parsed.pathname;
  return `${host}${path}${parsed.search}`;
}

/** The URL as served, without its fragment. */
function servedUrlOf(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  return parsed.toString();
}

function pageItem(page: UrlCrawlPage): SyncItem {
  const url = servedUrlOf(page.url);
  const name = page.websiteTitle.trim() || url;
  return {
    id: itemIdOf(url),
    path: url,
    name,
    // Pages are stored as the text the crawler extracts.
    fileName: `${name}.txt`,
    url,
    version: `sha256:${createHash('sha256').update(page.content).digest('hex')}`,
    size: Buffer.byteLength(page.content),
  };
}

function pdfItem(pdf: UrlCrawlPdf): SyncItem[] {
  if (!pdf.version) return [];
  const url = servedUrlOf(pdf.url);
  const name = pdf.name.trim() || url;
  return [
    {
      id: itemIdOf(url),
      path: url,
      name,
      fileName: name.toLowerCase().endsWith(PDF_EXTENSION)
        ? name
        : `${name}${PDF_EXTENSION}`,
      url,
      version: pdf.version,
      // Not known before the download; the download cap bounds it.
      size: 0,
    },
  ];
}

function isPdf(file: SyncedFile): boolean {
  return extname(file.typedFileName()).toLowerCase() === PDF_EXTENSION;
}

/**
 * Whether the website caused the failure: it did not answer, answered with
 * an error, served something that cannot be crawled, or its domain is not
 * this organisation's to crawl.
 */
function isWebsiteFailure(error: unknown): error is ApplicationError {
  if (
    error instanceof UnexpectedUrlRetrieverError ||
    error instanceof UrlRetrieverProviderNotAvailableError
  )
    return false;
  return [
    UrlRetrieverError,
    CrawlDomainAccessDeniedError,
    FileTooLargeError,
    InvalidFileTypeError,
    TooManyPagesError,
    UnprocessableDocumentError,
  ].some((type) => error instanceof type);
}

/** What a failed read says about the page or PDF for good, if anything. */
function settledFailure(error: unknown): SyncItemContentResult | null {
  if (
    error instanceof UrlRetrieverHttpError &&
    GONE_STATUSES.has(error.upstreamStatus)
  )
    return { outcome: SyncSourceOutcome.GONE };
  if (
    error instanceof UrlRetrieverContentTooLargeError ||
    error instanceof FileTooLargeError
  )
    return {
      outcome: SyncSourceOutcome.UNPROCESSABLE,
      reason: SyncedFileSkipReason.TOO_LARGE,
    };
  if (
    error instanceof UrlRetrieverUnsupportedContentTypeError ||
    error instanceof InvalidFileTypeError
  )
    return {
      outcome: SyncSourceOutcome.UNPROCESSABLE,
      reason: SyncedFileSkipReason.UNSUPPORTED_TYPE,
    };
  return null;
}
