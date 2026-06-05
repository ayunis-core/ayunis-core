import { CrawlDomainGrant } from 'src/domain/crawl-domain-grants/domain/crawl-domain-grant.entity';
import { CrawlDomainGrantRecord } from '../schema/crawl-domain-grant.record';

export class CrawlDomainGrantMapper {
  static toDomain(record: CrawlDomainGrantRecord): CrawlDomainGrant {
    return new CrawlDomainGrant({
      id: record.id,
      orgId: record.orgId,
      domain: record.domain,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: CrawlDomainGrant): CrawlDomainGrantRecord {
    const record = new CrawlDomainGrantRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.domain = domain.domain;
    record.createdAt = domain.createdAt;
    record.updatedAt = new Date();
    return record;
  }
}
