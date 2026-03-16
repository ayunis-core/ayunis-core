import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { IpAllowlistRepository } from '../../../application/ports/ip-allowlist.repository';
import { IpAllowlist } from '../../../domain/ip-allowlist.entity';
import { IpAllowlistRecord } from './schema/ip-allowlist.record';
import { IpAllowlistMapper } from './mappers/ip-allowlist.mapper';

@Injectable()
export class PostgresIpAllowlistRepository extends IpAllowlistRepository {
  private readonly logger = new Logger(PostgresIpAllowlistRepository.name);

  constructor(
    @InjectRepository(IpAllowlistRecord)
    private readonly repository: Repository<IpAllowlistRecord>,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<IpAllowlist | null> {
    this.logger.debug('findByOrgId', { orgId });

    const record = await this.repository.findOne({ where: { orgId } });
    if (!record) {
      return null;
    }

    return IpAllowlistMapper.toDomain(record);
  }

  async upsert(entity: IpAllowlist): Promise<IpAllowlist> {
    this.logger.debug('upsert', { orgId: entity.orgId });

    const record = IpAllowlistMapper.toRecord(entity);

    await this.repository.upsert(record, ['orgId']);

    // Re-fetch to get accurate DB-managed timestamps
    const saved = await this.findByOrgId(entity.orgId);

    if (!saved) {
      throw new Error('Failed to re-fetch ip allowlist after upsert');
    }

    return saved;
  }

  async deleteByOrgId(orgId: UUID): Promise<void> {
    this.logger.debug('deleteByOrgId', { orgId });

    await this.repository.delete({ orgId });
  }
}
