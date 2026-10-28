import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID, type UUID } from 'crypto';
import {
  OrgChatSettingsRepository,
  type OrgChatSettingsUpdate,
} from 'src/domain/chat-settings/application/ports/org-chat-settings.repository';
import { OrgChatSettings } from 'src/domain/chat-settings/domain/org-chat-settings.entity';
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
    this.logger.log({ orgId }, 'findByOrgId');

    const record = await this.repository.findOne({ where: { orgId } });

    if (!record) {
      this.logger.debug({ orgId }, 'No org chat settings found');
      return null;
    }

    return this.mapper.toDomain(record);
  }

  async upsert(
    orgId: UUID,
    settings: OrgChatSettingsUpdate,
  ): Promise<OrgChatSettings> {
    const suppliedSettings: OrgChatSettingsUpdate = {};
    if (settings.internetSearchEnabled !== undefined) {
      suppliedSettings.internetSearchEnabled = settings.internetSearchEnabled;
    }
    if (settings.anonymousModeByDefault !== undefined) {
      suppliedSettings.anonymousModeByDefault = settings.anonymousModeByDefault;
    }
    // Updating only supplied columns prevents concurrent toggles from overwriting each other.
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(OrgChatSettingsRecord)
      .values({ id: randomUUID(), orgId, ...suppliedSettings })
      .orUpdate(Object.keys(suppliedSettings), ['orgId'])
      .returning('*')
      .execute();
    const [record] = result.raw as OrgChatSettingsRecord[];
    return this.mapper.toDomain(record);
  }
}
