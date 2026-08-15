import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { CrawlDomainGrant } from 'src/domain/crawl-domain-grants/domain/crawl-domain-grant.entity';
import { normalizeHost } from 'src/domain/crawl-domain-grants/domain/crawl-domain.util';
import { InvalidCrawlDomainError } from 'src/domain/crawl-domain-grants/domain/crawl-domain.errors';
import { CrawlDomainGrantRepository } from '../../ports/crawl-domain-grant.repository';
import {
  CrawlDomainAlreadyAssignedError,
  InvalidCrawlDomainApplicationError,
  UnexpectedCrawlDomainGrantError,
} from '../../crawl-domain-grants.errors';
import { GrantCrawlDomainCommand } from './grant-crawl-domain.command';

@Injectable()
export class GrantCrawlDomainUseCase {
  constructor(
    @InjectPinoLogger(GrantCrawlDomainUseCase.name)
    private readonly logger: PinoLogger,
    private readonly crawlDomainGrantRepository: CrawlDomainGrantRepository,
  ) {}

  async execute(command: GrantCrawlDomainCommand): Promise<CrawlDomainGrant> {
    this.logger.info(
      {
        orgId: command.orgId,
        domain: command.domain,
      },
      'Granting crawl domain',
    );

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
      this.logger.error(
        {
          err: error as Error,
        },
        'Error granting crawl domain',
      );
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
