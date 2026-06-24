import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { CrawlDomainGrant } from '../../../domain/crawl-domain-grant.entity';
import { CrawlDomainGrantRepository } from '../../ports/crawl-domain-grant.repository';
import { UnexpectedCrawlDomainGrantError } from '../../crawl-domain-grants.errors';
import { ListOrgCrawlDomainsQuery } from './list-org-crawl-domains.query';

@Injectable()
export class ListOrgCrawlDomainsUseCase {
  private readonly logger = new Logger(ListOrgCrawlDomainsUseCase.name);

  constructor(
    private readonly crawlDomainGrantRepository: CrawlDomainGrantRepository,
  ) {}

  async execute(query: ListOrgCrawlDomainsQuery): Promise<CrawlDomainGrant[]> {
    this.logger.log('Listing crawl domains', { orgId: query.orgId });

    try {
      return await this.crawlDomainGrantRepository.findAllByOrgId(query.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error listing crawl domains', {
        error: error as Error,
      });
      throw new UnexpectedCrawlDomainGrantError('list', {
        error: error as Error,
      });
    }
  }
}
