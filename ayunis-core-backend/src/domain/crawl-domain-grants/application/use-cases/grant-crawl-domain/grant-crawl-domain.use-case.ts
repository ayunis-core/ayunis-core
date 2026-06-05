import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { CrawlDomainGrant } from '../../../domain/crawl-domain-grant.entity';
import { normalizeHost } from '../../../domain/crawl-domain.util';
import { InvalidCrawlDomainError } from '../../../domain/crawl-domain.errors';
import { CrawlDomainGrantRepository } from '../../ports/crawl-domain-grant.repository';
import {
  CrawlDomainAlreadyAssignedError,
  InvalidCrawlDomainApplicationError,
  UnexpectedCrawlDomainGrantError,
} from '../../crawl-domain-grants.errors';
import { GrantCrawlDomainCommand } from './grant-crawl-domain.command';

@Injectable()
export class GrantCrawlDomainUseCase {
  private readonly logger = new Logger(GrantCrawlDomainUseCase.name);

  constructor(
    private readonly crawlDomainGrantRepository: CrawlDomainGrantRepository,
  ) {}

  async execute(command: GrantCrawlDomainCommand): Promise<CrawlDomainGrant> {
    this.logger.log('Granting crawl domain', {
      orgId: command.orgId,
      domain: command.domain,
    });

    try {
      const domain = this.normalize(command.domain);

      const existing =
        await this.crawlDomainGrantRepository.findByDomain(domain);
      if (existing) {
        if (existing.orgId === command.orgId) {
          // Already granted to this org — idempotent.
          return existing;
        }
        throw new CrawlDomainAlreadyAssignedError({ domain });
      }

      const grant = new CrawlDomainGrant({ orgId: command.orgId, domain });
      return await this.crawlDomainGrantRepository.create(grant);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error granting crawl domain', {
        error: error as Error,
      });
      throw new UnexpectedCrawlDomainGrantError('grant', {
        error: error as Error,
      });
    }
  }

  private normalize(input: string): string {
    try {
      return normalizeHost(input);
    } catch (error) {
      if (error instanceof InvalidCrawlDomainError) {
        throw new InvalidCrawlDomainApplicationError(error.message);
      }
      throw error;
    }
  }
}
