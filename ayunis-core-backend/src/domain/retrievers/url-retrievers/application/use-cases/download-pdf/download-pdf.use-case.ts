import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AssertCrawlDomainAccessCommand } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.command';
import { AssertCrawlDomainAccessUseCase } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.use-case';
import { UrlRetrieverHandler } from 'src/domain/retrievers/url-retrievers/application/ports/url-retriever.handler';
import {
  UnexpectedUrlRetrieverError,
  UrlRetrieverUnsupportedContentTypeError,
} from 'src/domain/retrievers/url-retrievers/application/url-retriever.errors';
import { isPdfResponse } from 'src/domain/retrievers/url-retrievers/domain/pdf-link';
import { DownloadPdfCommand } from './download-pdf.command';

/**
 * A linked PDF's bytes as served, unparsed, through the discovered-PDF path
 * of `GetPdfVersionUseCase`: the crawl gate on the URL and every redirect,
 * an explicit grant for private or reserved destinations, and the download
 * cap. A response that is not a PDF is refused before its body is read.
 */
@Injectable()
export class DownloadPdfUseCase {
  private readonly logger = new Logger(DownloadPdfUseCase.name);

  constructor(
    private readonly handler: UrlRetrieverHandler,
    private readonly assertCrawlDomainAccessUseCase: AssertCrawlDomainAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedUrlRetrieverError)
  async execute(command: DownloadPdfCommand): Promise<Buffer> {
    this.logger.debug('Downloading PDF');
    const { url, orgId } = command;
    await this.assertCrawlDomainAccessUseCase.execute(
      new AssertCrawlDomainAccessCommand(url, orgId),
    );
    const raw = await this.handler.fetch({
      url,
      assertPrivateDestinationAccess: (destination) =>
        this.assertCrawlDomainAccessUseCase.execute(
          new AssertCrawlDomainAccessCommand(destination, orgId, true),
        ),
      onRedirect: (destination) =>
        this.assertCrawlDomainAccessUseCase.execute(
          new AssertCrawlDomainAccessCommand(destination, orgId),
        ),
      assertContentType: (contentType, finalUrl) => {
        if (!isPdfResponse(contentType, finalUrl, url))
          throw new UrlRetrieverUnsupportedContentTypeError(
            finalUrl,
            contentType.split(';')[0].trim(),
          );
      },
    });
    return raw.body;
  }
}
