import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CrawlDomainGrantRecord } from './infrastructure/persistence/postgres/schema/crawl-domain-grant.record';
import { CrawlDomainGrantRepository } from './application/ports/crawl-domain-grant.repository';
import { PostgresCrawlDomainGrantRepository } from './infrastructure/persistence/postgres/crawl-domain-grant.repository';

import { AssertCrawlDomainAccessUseCase } from './application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.use-case';
import { GrantCrawlDomainUseCase } from './application/use-cases/grant-crawl-domain/grant-crawl-domain.use-case';
import { ListOrgCrawlDomainsUseCase } from './application/use-cases/list-org-crawl-domains/list-org-crawl-domains.use-case';
import { RevokeCrawlDomainUseCase } from './application/use-cases/revoke-crawl-domain/revoke-crawl-domain.use-case';

import { SuperAdminCrawlDomainsController } from './presenters/http/super-admin-crawl-domains.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CrawlDomainGrantRecord])],
  controllers: [SuperAdminCrawlDomainsController],
  providers: [
    {
      provide: CrawlDomainGrantRepository,
      useClass: PostgresCrawlDomainGrantRepository,
    },
    AssertCrawlDomainAccessUseCase,
    GrantCrawlDomainUseCase,
    ListOrgCrawlDomainsUseCase,
    RevokeCrawlDomainUseCase,
  ],
  // Consumed by the url-retrievers chokepoint to enforce org-scoped crawling.
  exports: [AssertCrawlDomainAccessUseCase],
})
export class CrawlDomainGrantsModule {}
