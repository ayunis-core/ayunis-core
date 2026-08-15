import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { OrgChatSettingsRepository } from 'src/domain/chat-settings/application/ports/org-chat-settings.repository';
import { OrgChatSettings } from 'src/domain/chat-settings/domain/org-chat-settings.entity';
import { OrgChatSettingsRecord } from './schema/org-chat-settings.record';
import { OrgChatSettingsMapper } from './mappers/org-chat-settings.mapper';

@Injectable()
export class LocalOrgChatSettingsRepository extends OrgChatSettingsRepository {
  constructor(
    @InjectPinoLogger(LocalOrgChatSettingsRepository.name)
    private readonly logger: PinoLogger,
    @InjectRepository(OrgChatSettingsRecord)
    private readonly repository: Repository<OrgChatSettingsRecord>,
    private readonly mapper: OrgChatSettingsMapper,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<OrgChatSettings | null> {
    this.logger.info({ orgId }, 'findByOrgId');

    const record = await this.repository.findOne({ where: { orgId } });

    if (!record) {
      this.logger.debug({ orgId }, 'No org chat settings found');
      return null;
    }

    return this.mapper.toDomain(record);
  }

  async upsert(orgChatSettings: OrgChatSettings): Promise<OrgChatSettings> {
    this.logger.info({ orgId: orgChatSettings.orgId }, 'upsert');

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

    this.logger.debug(
      {
        orgId: orgChatSettings.orgId,
        id: savedRecord.id,
      },
      'Org chat settings upserted',
    );

    return this.mapper.toDomain(savedRecord);
  }
}
