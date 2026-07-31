import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { OrgAcademyAccessSettingsRepository } from 'src/iam/academy-access/application/ports/org-academy-access-settings.repository';
import { OrgAcademyAccessSettings } from 'src/iam/academy-access/domain/org-academy-access-settings.entity';
import { OrgAcademyAccessSettingsRecord } from './schema/org-academy-access-settings.record';
import { OrgAcademyAccessSettingsMapper } from './mappers/org-academy-access-settings.mapper';

@Injectable()
export class PostgresOrgAcademyAccessSettingsRepository extends OrgAcademyAccessSettingsRepository {
  private readonly logger = new Logger(
    PostgresOrgAcademyAccessSettingsRepository.name,
  );

  constructor(
    @InjectRepository(OrgAcademyAccessSettingsRecord)
    private readonly repository: Repository<OrgAcademyAccessSettingsRecord>,
    private readonly mapper: OrgAcademyAccessSettingsMapper,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<OrgAcademyAccessSettings | null> {
    const record = await this.repository.findOne({ where: { orgId } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async upsert(
    settings: OrgAcademyAccessSettings,
  ): Promise<OrgAcademyAccessSettings> {
    this.logger.log('upsert', { orgId: settings.orgId, mode: settings.mode });

    await this.repository.upsert(this.mapper.toRecord(settings), {
      conflictPaths: ['orgId'],
      skipUpdateIfNoValuesChanged: true,
    });

    // Re-read so the caller gets the surviving row's id, not the one a losing
    // insert generated.
    const saved = await this.repository.findOneOrFail({
      where: { orgId: settings.orgId },
    });
    return this.mapper.toDomain(saved);
  }
}
