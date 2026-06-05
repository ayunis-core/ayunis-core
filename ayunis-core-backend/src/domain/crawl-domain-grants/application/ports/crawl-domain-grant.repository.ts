import type { UUID } from 'crypto';
import type { CrawlDomainGrant } from '../../domain/crawl-domain-grant.entity';

export abstract class CrawlDomainGrantRepository {
  /** Exact-host lookup — the comparison key for both the chokepoint and conflict checks. */
  abstract findByDomain(domain: string): Promise<CrawlDomainGrant | null>;
  abstract findAllByOrgId(orgId: UUID): Promise<CrawlDomainGrant[]>;
  abstract findById(id: UUID): Promise<CrawlDomainGrant | null>;
  abstract create(grant: CrawlDomainGrant): Promise<CrawlDomainGrant>;
  abstract delete(id: UUID): Promise<void>;
}
