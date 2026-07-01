import type { UUID } from 'crypto';
import type { OrgChatSettings } from '../../domain/org-chat-settings.entity';

export abstract class OrgChatSettingsRepository {
  abstract findByOrgId(orgId: UUID): Promise<OrgChatSettings | null>;
  abstract upsert(orgChatSettings: OrgChatSettings): Promise<OrgChatSettings>;
}
