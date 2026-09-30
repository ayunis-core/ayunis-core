import { Injectable } from '@nestjs/common';
import { OrgChatSettingsRecord } from 'src/domain/chat-settings/infrastructure/persistence/local-org-chat-settings/schema/org-chat-settings.record';
import { OrgChatSettings } from 'src/domain/chat-settings/domain/org-chat-settings.entity';

@Injectable()
export class OrgChatSettingsMapper {
  toDomain(record: OrgChatSettingsRecord): OrgChatSettings {
    return new OrgChatSettings({
      id: record.id,
      orgId: record.orgId,
      internetSearchEnabled: record.internetSearchEnabled,
      anonymousModeByDefault: record.anonymousModeByDefault,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: OrgChatSettings): OrgChatSettingsRecord {
    const record = new OrgChatSettingsRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.internetSearchEnabled = domain.internetSearchEnabled;
    record.anonymousModeByDefault = domain.anonymousModeByDefault;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
