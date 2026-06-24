import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { CrawlDomainGrantRepository } from 'src/domain/crawl-domain-grants/application/ports/crawl-domain-grant.repository';
import { CrawlDomainGrant } from 'src/domain/crawl-domain-grants/domain/crawl-domain-grant.entity';
import { CrawlDomainGrantRecord } from './schema/crawl-domain-grant.record';
import { CrawlDomainGrantMapper } from './mappers/crawl-domain-grant.mapper';

@Injectable()
export class PostgresCrawlDomainGrantRepository extends CrawlDomainGrantRepository {
  private readonly logger = new Logger(PostgresCrawlDomainGrantRepository.name);

  constructor(
    @InjectRepository(CrawlDomainGrantRecord)
    private readonly repository: Repository<CrawlDomainGrantRecord>,
  ) {
    super();
  }

  async findByDomain(domain: string): Promise<CrawlDomainGrant | null> {
    const record = await this.repository.findOne({ where: { domain } });
    return record ? CrawlDomainGrantMapper.toDomain(record) : null;
  }

  async findAllByOrgId(orgId: UUID): Promise<CrawlDomainGrant[]> {
    const records = await this.repository.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => CrawlDomainGrantMapper.toDomain(record));
  }

  async findById(id: UUID): Promise<CrawlDomainGrant | null> {
    const record = await this.repository.findOne({ where: { id } });
    return record ? CrawlDomainGrantMapper.toDomain(record) : null;
  }

  async create(grant: CrawlDomainGrant): Promise<CrawlDomainGrant> {
    this.logger.debug('create', { orgId: grant.orgId, domain: grant.domain });

    const record = CrawlDomainGrantMapper.toRecord(grant);
    await this.repository.save(record);

    // Re-fetch to get accurate DB-managed timestamps.
    const saved = await this.findById(grant.id);
    if (!saved) {
      throw new Error('Failed to re-fetch crawl domain grant after save');
    }
    return saved;
  }

  async delete(id: UUID): Promise<void> {
    await this.repository.delete({ id });
  }
}
