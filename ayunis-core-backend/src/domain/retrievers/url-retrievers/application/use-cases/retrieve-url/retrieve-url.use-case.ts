import { Injectable, Logger } from '@nestjs/common';
import { UrlRetrieverResult } from '../../../domain/url-retriever-result.entity';
import { RetrieveUrlCommand } from './retrieve-url.command';
import {
  RawUrlResponse,
  UrlRetrieverHandler,
} from '../../ports/url-retriever.handler';
import {
  UrlRetrieverProviderNotAvailableError,
  UrlRetrieverUnsupportedContentTypeError,
  UrlRetrieverParsingError,
} from '../../url-retriever.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { AssertCrawlDomainAccessUseCase } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.use-case';
import { AssertCrawlDomainAccessCommand } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.command';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';

const PDF_MIME_TYPE = 'application/pdf';

@Injectable()
export class RetrieveUrlUseCase {
  private readonly logger = new Logger(RetrieveUrlUseCase.name);

  constructor(
    private readonly handler: UrlRetrieverHandler,
    private readonly assertCrawlDomainAccessUseCase: AssertCrawlDomainAccessUseCase,
    private readonly retrieveFileContentUseCase: RetrieveFileContentUseCase,
  ) {}

  async execute(command: RetrieveUrlCommand): Promise<UrlRetrieverResult> {
    this.logger.debug(`Retrieving URL: ${command.url}`);

    // Org-scoped crawl gate — runs BEFORE the try/catch so a thrown
    // CrawlDomainAccessDeniedError (404) is not swallowed into a retriever
    // provider error. This is the single chokepoint both crawl entry points
    // (knowledge-base URL sources and the website_content tool) flow through.
    await this.assertCrawlDomainAccessUseCase.execute(
      new AssertCrawlDomainAccessCommand(command.url, command.orgId),
    );

    try {
      // The infrastructure handler only fetches raw bytes and re-asserts the
      // gate on each redirect hop (see AYC-190). Interpreting the content type
      // is an application concern, so it lives here — not in the adapter.
      const raw = await this.handler.fetch({
        url: command.url,
        options: command.options,
        onRedirect: (url) =>
          this.assertCrawlDomainAccessUseCase.execute(
            new AssertCrawlDomainAccessCommand(url, command.orgId),
          ),
        // Let the handler reject unsupported types from headers alone, before it
        // buffers the body. Content-type interpretation is an application
        // concern, so the policy stays here rather than in the adapter.
        assertContentType: (contentType, finalUrl) =>
          this.assertContentTypeAcceptable(contentType, finalUrl, command.url),
      });
      return await this.parseByContentType(raw, command.url);
    } catch (error) {
      return this.mapError(error, command.url);
    }
  }

  /**
   * Dispatch on content type: PDFs are delegated to the file-parsing pipeline,
   * HTML is parsed by the URL retriever infrastructure, plain text is returned
   * verbatim, and anything else is rejected as unsupported.
   */
  private async parseByContentType(
    raw: RawUrlResponse,
    requestedUrl: string,
  ): Promise<UrlRetrieverResult> {
    if (this.isPdf(raw.contentType, raw.finalUrl, requestedUrl)) {
      return this.parsePdf(raw);
    }

    this.assertSupportedContentType(raw.contentType, raw.finalUrl);

    const text = this.decodeBody(raw);
    if (raw.contentType.includes('text/plain')) {
      return new UrlRetrieverResult(text.trim(), raw.finalUrl, '');
    }
    return this.handler.parseHtml(text, raw.finalUrl);
  }

  /**
   * Decode the body using the charset declared in the Content-Type header
   * (e.g. `text/html; charset=iso-8859-1`), so Latin-1/Windows-1252 pages don't
   * become mojibake. Falls back to UTF-8 when no charset is given or the label
   * is unknown. Charset declared only in an HTML `<meta>` tag is not handled.
   */
  private decodeBody(raw: RawUrlResponse): string {
    const charset = /charset\s*=\s*["']?([^;"']+)/
      .exec(raw.contentType)?.[1]
      ?.trim();
    if (charset && charset !== 'utf-8' && charset !== 'utf8') {
      try {
        return new TextDecoder(charset).decode(raw.body);
      } catch {
        // Unknown/unsupported charset label — fall back to UTF-8 below.
      }
    }
    return raw.body.toString('utf8');
  }

  private mapError(error: unknown, url: string): never {
    // Preserve any domain error with its own code and HTTP status:
    //  - crawl-gate denials (CrawlDomainAccessDeniedError — hide-existence 404)
    //  - URL retriever failures (timeouts, HTTP errors, parsing)
    //  - file-pipeline errors surfaced from PDF parsing (e.g. FileTooLargeError 413)
    // All extend ApplicationError; only genuinely unknown errors are masked.
    if (error instanceof ApplicationError) {
      throw error;
    }

    // Otherwise log and convert to appropriate domain error
    this.logger.error(
      `URL retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : 'Unknown error',
    );

    throw new UrlRetrieverProviderNotAvailableError(
      this.handler.constructor.name,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        url,
      },
    );
  }

  /**
   * A response is treated as a PDF when the server says so, or when the server
   * sends a generic/absent content type but a candidate URL ends in `.pdf`
   * (some hosts serve PDFs as application/octet-stream or with no content type
   * at all). Both the originally-requested URL and the post-redirect final URL
   * are candidates: a `.pdf` link often redirects to a signed CDN URL whose
   * path no longer carries the extension.
   */
  private isPdf(contentType: string, ...urls: string[]): boolean {
    // `application/x-pdf` is a legacy alias some servers still send.
    if (
      contentType.includes(PDF_MIME_TYPE) ||
      contentType.includes('application/x-pdf')
    ) {
      return true;
    }
    const isGenericType =
      contentType === '' ||
      contentType.includes('application/octet-stream') ||
      contentType.includes('binary/octet-stream');
    return isGenericType && urls.some((url) => this.hasPdfExtension(url));
  }

  private hasPdfExtension(url: string): boolean {
    try {
      const pathname = new URL(url).pathname;
      // Decode percent-encoding so `/report%2Epdf` is recognized. Falls back to
      // the raw pathname if the encoding is malformed.
      let decoded = pathname;
      try {
        decoded = decodeURIComponent(pathname);
      } catch {
        // Malformed percent-encoding — check the raw pathname instead.
      }
      return decoded.toLowerCase().endsWith('.pdf');
    } catch {
      return false;
    }
  }

  /**
   * Delegate PDF parsing to the file-retrieval pipeline (Mistral OCR or
   * pdf-parse), flattening the extracted pages into the text content the
   * crawler indexes. PDFs have no anchors to follow, so the result has no links.
   */
  private async parsePdf(raw: RawUrlResponse): Promise<UrlRetrieverResult> {
    const fileName = this.fileNameFromUrl(raw.finalUrl);
    try {
      const result = await this.retrieveFileContentUseCase.execute(
        new RetrieveFileContentCommand({
          fileData: raw.body,
          fileName,
          fileType: PDF_MIME_TYPE,
        }),
      );
      const content = result.pages
        .map((page) => page.text)
        .join('\n\n')
        .trim();
      return new UrlRetrieverResult(
        content,
        raw.finalUrl,
        fileName,
        result.metadata,
        [],
      );
    } catch (error) {
      // Domain errors (the file pipeline's own failures) keep their meaning;
      // anything else is reported as a parsing failure for this URL.
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new UrlRetrieverParsingError(
        raw.finalUrl,
        error instanceof Error ? error.message : 'Unknown error',
        { error: error instanceof Error ? error.stack : 'Unknown error' },
      );
    }
  }

  private fileNameFromUrl(url: string): string {
    try {
      const lastSegment = new URL(url).pathname
        .split('/')
        .filter(Boolean)
        .pop();
      return lastSegment ? decodeURIComponent(lastSegment) : 'document.pdf';
    } catch {
      return 'document.pdf';
    }
  }

  /**
   * The header-only acceptability gate handed to the fetch handler: a response
   * is acceptable if it is a PDF (delegated to the file pipeline) or a supported
   * text type. Anything else is rejected before its body is downloaded. Mirrors
   * the dispatch in {@link parseByContentType}, which stays as defense-in-depth
   * for the actual parse.
   */
  private assertContentTypeAcceptable(
    contentType: string,
    finalUrl: string,
    requestedUrl: string,
  ): void {
    if (this.isPdf(contentType, finalUrl, requestedUrl)) {
      return;
    }
    this.assertSupportedContentType(contentType, finalUrl);
  }

  private assertSupportedContentType(contentType: string, url: string): void {
    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('xhtml')
    ) {
      throw new UrlRetrieverUnsupportedContentTypeError(
        url,
        contentType.split(';')[0].trim(),
      );
    }
  }
}
