import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { OrgChatSettingsRepository } from '../../../application/ports/org-chat-settings.repository';
import { OrgChatSettings } from '../../../domain/org-chat-settings.entity';
import { OrgChatSettingsRecord } from './schema/org-chat-settings.record';
import { OrgChatSettingsMapper } from './mappers/org-chat-settings.mapper';

@Injectable()
export class LocalOrgChatSettingsRepository extends OrgChatSettingsRepository {
  private readonly logger = new Logger(LocalOrgChatSettingsRepository.name);

  constructor(
    @InjectRepository(OrgChatSettingsRecord)
    private readonly repository: Repository<OrgChatSettingsRecord>,
    private readonly mapper: OrgChatSettingsMapper,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<OrgChatSettings | null> {
    this.logger.log('findByOrgId', { orgId });

    const record = await this.repository.findOne({ where: { orgId } });

    if (!record) {
      this.logger.debug('No org chat settings found', { orgId });
      return null;
    }

    return this.mapper.toDomain(record);
  }

  async upsert(orgChatSettings: OrgChatSettings): Promise<OrgChatSettings> {
    this.logger.log('upsert', { orgId: orgChatSettings.orgId });

    const record = this.mapper.toRecord(orgChatSettings);

    // Use atomic upsert with conflict resolution on orgId
    await this.repository.upsert(record, {
      conflictPaths: ['orgId'],
      skipUpdateIfNoValuesChanged: true,
    });

    // Fetch the saved record to get the actual id (may be existing or new)
    const savedRecord = await this.repository.findOneOrFail({
      where: { orgId: orgChatSettings.orgId },
    });

    this.logger.debug('Org chat settings upserted', {
      orgId: orgChatSettings.orgId,
      id: savedRecord.id,
    });

    return this.mapper.toDomain(savedRecord);
  }
}
