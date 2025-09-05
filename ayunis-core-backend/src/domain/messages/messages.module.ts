import { Module } from '@nestjs/common';
import { MESSAGES_REPOSITORY } from './application/ports/messages.repository';
import { LocalMessagesRepository } from './infrastructure/persistence/local/local-messages.repository';
import { LocalMessagesRepositoryModule } from './infrastructure/persistence/local/local-messages-repository.module';

// Use Cases
import { CreateUserMessageUseCase } from './application/use-cases/create-user-message/create-user-message.use-case';
import { CreateSystemMessageUseCase } from './application/use-cases/create-system-message/create-system-message.use-case';
import { CreateAssistantMessageUseCase } from './application/use-cases/create-assistant-message/create-assistant-message.use-case';
import { SaveAssistantMessageUseCase } from './application/use-cases/save-assistant-message/save-assistant-message.use-case';
import { CreateToolResultMessageUseCase } from './application/use-cases/create-tool-result-message/create-tool-result-message.use-case';

@Module({
  imports: [LocalMessagesRepositoryModule],
  providers: [
    {
      provide: MESSAGES_REPOSITORY,
      useExisting: LocalMessagesRepository,
    },
    // Use Cases
    CreateUserMessageUseCase,
    CreateSystemMessageUseCase,
    CreateAssistantMessageUseCase,
    SaveAssistantMessageUseCase,
    CreateToolResultMessageUseCase,
  ],
  exports: [
    MESSAGES_REPOSITORY,
    // Use Cases
    CreateUserMessageUseCase,
    CreateSystemMessageUseCase,
    CreateAssistantMessageUseCase,
    SaveAssistantMessageUseCase,
    CreateToolResultMessageUseCase,
  ],
})
export class MessagesModule {}
