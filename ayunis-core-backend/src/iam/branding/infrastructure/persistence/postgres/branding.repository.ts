import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { BrandingRepository } from '../../../application/ports/branding.repository';
import { Branding } from '../../../domain/branding.entity';
import { BrandingRecord } from './schema/branding.record';
import { BrandingMapper } from './mappers/branding.mapper';

@Injectable()
export class PostgresBrandingRepository extends BrandingRepository {
  private readonly logger = new Logger(PostgresBrandingRepository.name);

  constructor(
    @InjectRepository(BrandingRecord)
    private readonly repository: Repository<BrandingRecord>,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<Branding | null> {
    this.logger.debug('findByOrgId', { orgId });

    const record = await this.repository.findOne({ where: { orgId } });
    if (!record) {
      return null;
    }

    return BrandingMapper.toDomain(record);
  }

  async upsert(branding: Branding): Promise<Branding> {
    this.logger.debug('upsert', { orgId: branding.orgId });

    const record = BrandingMapper.toRecord(branding);

    await this.repository.upsert(record, ['orgId']);

    // Re-fetch to get accurate DB-managed timestamps
    const saved = await this.findByOrgId(branding.orgId);

    if (!saved) {
      throw new Error('Failed to re-fetch branding after upsert');
    }

    return saved;
  }
}
