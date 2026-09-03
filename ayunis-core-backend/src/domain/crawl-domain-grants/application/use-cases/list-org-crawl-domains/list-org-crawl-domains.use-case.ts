import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { CrawlDomainGrant } from 'src/domain/crawl-domain-grants/domain/crawl-domain-grant.entity';
import { CrawlDomainGrantRepository } from 'src/domain/crawl-domain-grants/application/ports/crawl-domain-grant.repository';
import { UnexpectedCrawlDomainGrantError } from 'src/domain/crawl-domain-grants/application/crawl-domain-grants.errors';
import { ListOrgCrawlDomainsQuery } from './list-org-crawl-domains.query';

@Injectable()
export class ListOrgCrawlDomainsUseCase {
  private readonly logger = new Logger(ListOrgCrawlDomainsUseCase.name);

  constructor(
    private readonly crawlDomainGrantRepository: CrawlDomainGrantRepository,
  ) {}

  async execute(query: ListOrgCrawlDomainsQuery): Promise<CrawlDomainGrant[]> {
    this.logger.log({ orgId: query.orgId }, 'Listing crawl domains');

    try {
      return await this.crawlDomainGrantRepository.findAllByOrgId(query.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error listing crawl domains',
      );
      throw new UnexpectedCrawlDomainGrantError('list', {
        error: error as Error,
      });
    }
  }
}
