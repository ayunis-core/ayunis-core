import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AssertCrawlDomainAccessUseCase } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.use-case';
import { AssertCrawlDomainAccessCommand } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.command';
import {
  UrlRetrieverHandler,
  type UrlHeadResponse,
  type UrlRetrieverInput,
} from 'src/domain/retrievers/url-retrievers/application/ports/url-retriever.handler';
import {
  UnexpectedUrlRetrieverError,
  UrlRetrieverContentTooLargeError,
  UrlRetrieverHttpError,
} from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
import {
  PDF_VERSION_TOO_LARGE,
  pdfVersionFromContent,
  pdfVersionFromHeaders,
} from 'src/domain/retrievers/url-retrievers/domain/pdf-version';
import { GetPdfVersionCommand } from './get-pdf-version.command';

/**
 * A PDF's version from a HEAD request, or a hash of the download when the
 * server sends no validator (`PDF_VERSION_TOO_LARGE` when the download
 * exceeds the cap). Both requests take the discovered-PDF path of
 * `CrawledPdfSourcesService`: the crawl gate on the URL and every redirect,
 * and an explicit grant for private or reserved destinations.
 */
@Injectable()
export class GetPdfVersionUseCase {
  private readonly logger = new Logger(GetPdfVersionUseCase.name);

  constructor(
    private readonly handler: UrlRetrieverHandler,
    private readonly assertCrawlDomainAccessUseCase: AssertCrawlDomainAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedUrlRetrieverError)
  async execute(command: GetPdfVersionCommand): Promise<string> {
    await this.assertCrawlDomainAccessUseCase.execute(
      new AssertCrawlDomainAccessCommand(command.url, command.orgId),
    );
    const input = this.requestFor(command.url, command.orgId);
    const head = await this.headUnlessRejected(input);
    const version = head && pdfVersionFromHeaders(head);
    if (version) return version;
    this.logger.debug('No PDF validator headers, hashing the download');
    return this.hashDownload(input);
  }

  private async hashDownload(input: UrlRetrieverInput): Promise<string> {
    try {
      const raw = await this.handler.fetch(input);
      return pdfVersionFromContent(raw.body);
    } catch (error) {
      if (error instanceof UrlRetrieverContentTooLargeError)
        return PDF_VERSION_TOO_LARGE;
      throw error;
    }
  }

  /**
   * Servers that refuse HEAD (405, 501, or a GET-only signed URL's 403) may
   * still serve the download, so any HTTP error falls back to it; the
   * download's own status then decides.
   */
  private async headUnlessRejected(
    input: UrlRetrieverInput,
  ): Promise<UrlHeadResponse | null> {
    try {
      return await this.handler.head(input);
    } catch (error) {
      if (error instanceof UrlRetrieverHttpError) return null;
      throw error;
    }
  }

  private requestFor(url: string, orgId: UUID): UrlRetrieverInput {
    return {
      url,
      assertPrivateDestinationAccess: (destination) =>
        this.assertCrawlDomainAccessUseCase.execute(
          new AssertCrawlDomainAccessCommand(destination, orgId, true),
        ),
      onRedirect: (destination) =>
        this.assertCrawlDomainAccessUseCase.execute(
          new AssertCrawlDomainAccessCommand(destination, orgId),
        ),
    };
  }
}
