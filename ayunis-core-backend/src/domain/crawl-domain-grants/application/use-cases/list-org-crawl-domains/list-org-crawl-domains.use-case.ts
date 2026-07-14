import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
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

  @HandleUnexpectedErrors(UnexpectedCrawlDomainGrantError)
  async execute(query: ListOrgCrawlDomainsQuery): Promise<CrawlDomainGrant[]> {
    this.logger.log('Listing crawl domains', { orgId: query.orgId });

    return await this.crawlDomainGrantRepository.findAllByOrgId(query.orgId);
  }
}
