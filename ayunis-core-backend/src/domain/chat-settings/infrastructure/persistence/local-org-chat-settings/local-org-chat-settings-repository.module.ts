import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgChatSettingsRecord } from './schema/org-chat-settings.record';
import { OrgChatSettingsMapper } from './mappers/org-chat-settings.mapper';
import { LocalOrgChatSettingsRepository } from './local-org-chat-settings.repository';
import { OrgChatSettingsRepository } from 'src/domain/chat-settings/application/ports/org-chat-settings.repository';

@Module({
  imports: [TypeOrmModule.forFeature([OrgChatSettingsRecord])],
  providers: [
    LocalOrgChatSettingsRepository,
    OrgChatSettingsMapper,
    {
      provide: OrgChatSettingsRepository,
      useClass: LocalOrgChatSettingsRepository,
    },
  ],
  exports: [OrgChatSettingsRepository],
})
export class LocalOrgChatSettingsRepositoryModule {}
