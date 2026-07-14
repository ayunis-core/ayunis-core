import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { CrawlDomainGrantRepository } from '../../ports/crawl-domain-grant.repository';
import {
  CrawlDomainAccessDeniedError,
  UnexpectedCrawlDomainGrantError,
} from '../../crawl-domain-grants.errors';
import { AssertCrawlDomainAccessCommand } from './assert-crawl-domain-access.command';
import { normalizeHost } from '../../../domain/crawl-domain.util';
import { InvalidCrawlDomainError } from '../../../domain/crawl-domain.errors';

/**
 * The single enforcement primitive for org-scoped crawling. Called from the
 * `RetrieveUrlUseCase` chokepoint before any fetch. Semantics:
 *  - host has no grant            → allowed (public web, unchanged)
 *  - host granted to this org     → allowed
 *  - host granted to another org  → CrawlDomainAccessDeniedError (404)
 */
@Injectable()
export class AssertCrawlDomainAccessUseCase {
  private readonly logger = new Logger(AssertCrawlDomainAccessUseCase.name);

  constructor(
    private readonly crawlDomainGrantRepository: CrawlDomainGrantRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCrawlDomainGrantError)
  async execute(command: AssertCrawlDomainAccessCommand): Promise<void> {
    const host = this.extractHost(command.url);
    if (!host) {
      // Unparseable URL cannot equal a normalized grant — leave it to the
      // retriever to fail naturally rather than blocking here.
      return;
    }

    const grant = await this.crawlDomainGrantRepository.findByDomain(host);
    if (grant && grant.orgId !== command.orgId) {
      this.logger.warn('Blocked cross-org crawl of a restricted domain', {
        host,
        orgId: command.orgId,
      });
      throw new CrawlDomainAccessDeniedError({ domain: host });
    }
  }

  private extractHost(url: string): string | null {
    try {
      // Use the same canonical normalization that grants are stored with so
      // the comparison key matches (lowercased, trailing FQDN dot stripped,
      // bare hosts accepted).
      return normalizeHost(url);
    } catch (error) {
      if (error instanceof InvalidCrawlDomainError) {
        return null;
      }
      throw error;
    }
  }
}
