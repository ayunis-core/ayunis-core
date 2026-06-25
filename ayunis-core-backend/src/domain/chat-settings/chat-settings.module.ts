import { Module } from '@nestjs/common';
import { ChatSettingsController } from './presenters/http/chat-settings.controller';
import { OrgSystemPromptController } from './presenters/http/org-system-prompt.controller';
import { OrgChatSettingsController } from './presenters/http/org-chat-settings.controller';
import { LocalUserSystemPromptsRepositoryModule } from './infrastructure/persistence/local-user-system-prompts/local-user-system-prompts-repository.module';
import { LocalOrgSystemPromptsRepositoryModule } from './infrastructure/persistence/local-org-system-prompts/local-org-system-prompts-repository.module';
import { LocalOrgChatSettingsRepositoryModule } from './infrastructure/persistence/local-org-chat-settings/local-org-chat-settings-repository.module';
import { GetUserSystemPromptUseCase } from './application/use-cases/get-user-system-prompt/get-user-system-prompt.use-case';
import { UpsertUserSystemPromptUseCase } from './application/use-cases/upsert-user-system-prompt/upsert-user-system-prompt.use-case';
import { DeleteUserSystemPromptUseCase } from './application/use-cases/delete-user-system-prompt/delete-user-system-prompt.use-case';
import { GetOrgSystemPromptUseCase } from './application/use-cases/get-org-system-prompt/get-org-system-prompt.use-case';
import { UpsertOrgSystemPromptUseCase } from './application/use-cases/upsert-org-system-prompt/upsert-org-system-prompt.use-case';
import { DeleteOrgSystemPromptUseCase } from './application/use-cases/delete-org-system-prompt/delete-org-system-prompt.use-case';
import { GetOrgChatSettingsUseCase } from './application/use-cases/get-org-chat-settings/get-org-chat-settings.use-case';
import { UpsertOrgChatSettingsUseCase } from './application/use-cases/upsert-org-chat-settings/upsert-org-chat-settings.use-case';
import { GeneratePersonalizedSystemPromptUseCase } from './application/use-cases/generate-personalized-system-prompt/generate-personalized-system-prompt.use-case';
import { ModelsModule } from '../models/models.module';

@Module({
  imports: [
    LocalUserSystemPromptsRepositoryModule,
    LocalOrgSystemPromptsRepositoryModule,
    LocalOrgChatSettingsRepositoryModule,
    ModelsModule,
  ],
  controllers: [
    ChatSettingsController,
    OrgSystemPromptController,
    OrgChatSettingsController,
  ],
  providers: [
    GetUserSystemPromptUseCase,
    UpsertUserSystemPromptUseCase,
    DeleteUserSystemPromptUseCase,
    GetOrgSystemPromptUseCase,
    UpsertOrgSystemPromptUseCase,
    DeleteOrgSystemPromptUseCase,
    GetOrgChatSettingsUseCase,
    UpsertOrgChatSettingsUseCase,
    GeneratePersonalizedSystemPromptUseCase,
  ],
  exports: [
    GetUserSystemPromptUseCase,
    GetOrgSystemPromptUseCase,
    GetOrgChatSettingsUseCase,
  ],
})
export class ChatSettingsModule {}
