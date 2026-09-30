import type { UUID } from 'crypto';
import type { OrgChatSettings } from 'src/domain/chat-settings/domain/org-chat-settings.entity';

export type OrgChatSettingsUpdate = Partial<
  Pick<OrgChatSettings, 'internetSearchEnabled' | 'anonymousModeByDefault'>
>;

export abstract class OrgChatSettingsRepository {
  abstract findByOrgId(orgId: UUID): Promise<OrgChatSettings | null>;
  abstract upsert(
    orgId: UUID,
    settings: OrgChatSettingsUpdate,
  ): Promise<OrgChatSettings>;
}
