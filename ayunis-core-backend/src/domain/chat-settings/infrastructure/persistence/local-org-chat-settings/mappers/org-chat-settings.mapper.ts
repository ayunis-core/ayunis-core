import { Injectable } from '@nestjs/common';
import { OrgChatSettingsRecord } from '../schema/org-chat-settings.record';
import { OrgChatSettings } from 'src/domain/chat-settings/domain/org-chat-settings.entity';

@Injectable()
export class OrgChatSettingsMapper {
  toDomain(record: OrgChatSettingsRecord): OrgChatSettings {
    return new OrgChatSettings({
      id: record.id,
      orgId: record.orgId,
      internetSearchEnabled: record.internetSearchEnabled,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: OrgChatSettings): OrgChatSettingsRecord {
    const record = new OrgChatSettingsRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.internetSearchEnabled = domain.internetSearchEnabled;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
