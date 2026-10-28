import type { OrgChatSettingsUpdate } from 'src/domain/chat-settings/application/ports/org-chat-settings.repository';

export class UpsertOrgChatSettingsCommand {
  constructor(public readonly settings: OrgChatSettingsUpdate) {}
}
