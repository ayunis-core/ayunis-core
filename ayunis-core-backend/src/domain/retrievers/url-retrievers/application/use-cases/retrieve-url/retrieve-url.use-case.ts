import { Injectable, Logger } from '@nestjs/common';
import { UrlRetrieverResult } from '../../../domain/url-retriever-result.entity';
import { RetrieveUrlCommand } from './retrieve-url.command';
import { UrlRetrieverHandler } from '../../ports/url-retriever.handler';
import {
  UrlRetrieverProviderNotAvailableError,
  UrlRetrieverError,
} from '../../url-retriever.errors';
import { CrawlDomainAccessDeniedError } from 'src/domain/crawl-domain-grants/application/crawl-domain-grants.errors';
import { AssertCrawlDomainAccessUseCase } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.use-case';
import { AssertCrawlDomainAccessCommand } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.command';

@Injectable()
export class RetrieveUrlUseCase {
  private readonly logger = new Logger(RetrieveUrlUseCase.name);

  constructor(
    private readonly handler: UrlRetrieverHandler,
    private readonly assertCrawlDomainAccessUseCase: AssertCrawlDomainAccessUseCase,
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
      return await this.handler.retrieveUrl({
        url: command.url,
        options: command.options,
        // Re-assert the gate on every redirect hop so a crawl cannot be bounced
        // onto a host bound to another org (see AYC-190).
        onRedirect: (url) =>
          this.assertCrawlDomainAccessUseCase.execute(
            new AssertCrawlDomainAccessCommand(url, command.orgId),
          ),
      });
    } catch (error) {
      // Preserve gate denials raised on a redirect hop so they keep their
      // hide-existence 404 instead of being masked as a provider error.
      if (error instanceof CrawlDomainAccessDeniedError) {
        throw error;
      }

      // Just rethrow if it's already a domain error
      if (error instanceof UrlRetrieverError) {
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
          url: command.url,
        },
      );
    }
  }
}
