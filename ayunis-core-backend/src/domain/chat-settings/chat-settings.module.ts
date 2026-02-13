import { Module } from '@nestjs/common';
import { ChatSettingsController } from './presenters/http/chat-settings.controller';
import { LocalUserSystemPromptsRepositoryModule } from './infrastructure/persistence/local-user-system-prompts/local-user-system-prompts-repository.module';
import { GetUserSystemPromptUseCase } from './application/use-cases/get-user-system-prompt/get-user-system-prompt.use-case';
import { UpsertUserSystemPromptUseCase } from './application/use-cases/upsert-user-system-prompt/upsert-user-system-prompt.use-case';
import { DeleteUserSystemPromptUseCase } from './application/use-cases/delete-user-system-prompt/delete-user-system-prompt.use-case';

@Module({
  imports: [LocalUserSystemPromptsRepositoryModule],
  controllers: [ChatSettingsController],
  providers: [
    GetUserSystemPromptUseCase,
    UpsertUserSystemPromptUseCase,
    DeleteUserSystemPromptUseCase,
  ],
  exports: [GetUserSystemPromptUseCase],
})
export class ChatSettingsModule {}
