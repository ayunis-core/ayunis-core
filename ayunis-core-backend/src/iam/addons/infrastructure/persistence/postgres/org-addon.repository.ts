import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { OrgAddonRepository } from 'src/iam/addons/application/ports/org-addon.repository';
import { OrgAddon } from 'src/iam/addons/domain/org-addon.entity';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import { OrgAddonRecord } from './schema/org-addon.record';
import { OrgAddonMapper } from './mappers/org-addon.mapper';

@Injectable()
export class PostgresOrgAddonRepository extends OrgAddonRepository {
  private readonly logger = new Logger(PostgresOrgAddonRepository.name);

  constructor(
    @InjectRepository(OrgAddonRecord)
    private readonly repository: Repository<OrgAddonRecord>,
  ) {
    super();
  }

  async findAllByOrgId(orgId: UUID): Promise<OrgAddon[]> {
    const records = await this.repository.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => OrgAddonMapper.toDomain(record));
  }

  async findByOrgAndType(
    orgId: UUID,
    type: AddonType,
  ): Promise<OrgAddon | null> {
    const record = await this.repository.findOne({ where: { orgId, type } });
    return record ? OrgAddonMapper.toDomain(record) : null;
  }

  async create(addon: OrgAddon): Promise<OrgAddon> {
    this.logger.debug('create', { orgId: addon.orgId, type: addon.type });

    const record = OrgAddonMapper.toRecord(addon);
    await this.repository.save(record);

    // Re-fetch to get accurate DB-managed timestamps.
    const saved = await this.repository.findOne({ where: { id: addon.id } });
    if (!saved) {
      throw new Error('Failed to re-fetch org addon after save');
    }
    return OrgAddonMapper.toDomain(saved);
  }

  async delete(id: UUID): Promise<void> {
    await this.repository.delete({ id });
  }
}
