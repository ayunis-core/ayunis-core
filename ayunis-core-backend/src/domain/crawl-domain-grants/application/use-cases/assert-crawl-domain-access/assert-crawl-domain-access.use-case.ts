import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { CrawlDomainGrantRepository } from '../../ports/crawl-domain-grant.repository';
import {
  CrawlDomainAccessDeniedError,
  UnexpectedCrawlDomainGrantError,
} from '../../crawl-domain-grants.errors';
import { AssertCrawlDomainAccessCommand } from './assert-crawl-domain-access.command';
import { normalizeHost } from 'src/domain/crawl-domain-grants/domain/crawl-domain.util';
import { InvalidCrawlDomainError } from 'src/domain/crawl-domain-grants/domain/crawl-domain.errors';

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

  async execute(command: AssertCrawlDomainAccessCommand): Promise<void> {
    try {
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
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error asserting crawl domain access', {
        error: error as Error,
      });
      throw new UnexpectedCrawlDomainGrantError('assert', {
        error: error as Error,
      });
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
