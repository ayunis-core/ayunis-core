import { Module, forwardRef } from '@nestjs/common';
import { MESSAGES_REPOSITORY } from './application/ports/messages.repository';
import { LocalMessagesRepository } from './infrastructure/persistence/local/local-messages.repository';
import { LocalMessagesRepositoryModule } from './infrastructure/persistence/local/local-messages-repository.module';
import { StorageModule } from 'src/domain/storage/storage.module';
import { TokenCounterModule } from 'src/common/token-counter/token-counter.module';

// Use Cases
import { CreateUserMessageUseCase } from './application/use-cases/create-user-message/create-user-message.use-case';
import { CreateSystemMessageUseCase } from './application/use-cases/create-system-message/create-system-message.use-case';
import { SaveAssistantMessageUseCase } from './application/use-cases/save-assistant-message/save-assistant-message.use-case';
import { CreateToolResultMessageUseCase } from './application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import { DeleteMessageUseCase } from './application/use-cases/delete-message/delete-message.use-case';
import { CleanupOrphanedImagesUseCase } from './application/use-cases/cleanup-orphaned-images/cleanup-orphaned-images.use-case';
import { CountMessagesTokensUseCase } from './application/use-cases/count-messages-tokens/count-messages-tokens.use-case';

// Services
import { ImageContentService } from './application/services/image-content.service';

// Tasks
import { OrphanedImagesCleanupTask } from './infrastructure/tasks/orphaned-images-cleanup.task';

@Module({
  imports: [
    LocalMessagesRepositoryModule,
    forwardRef(() => StorageModule),
    TokenCounterModule,
  ],
  providers: [
    {
      provide: MESSAGES_REPOSITORY,
      useExisting: LocalMessagesRepository,
    },
    // Use Cases
    CreateUserMessageUseCase,
    CreateSystemMessageUseCase,
    SaveAssistantMessageUseCase,
    CreateToolResultMessageUseCase,
    DeleteMessageUseCase,
    CleanupOrphanedImagesUseCase,
    CountMessagesTokensUseCase,
    // Services
    ImageContentService,
    // Tasks
    OrphanedImagesCleanupTask,
  ],
  exports: [
    MESSAGES_REPOSITORY,
    // Use Cases
    CreateUserMessageUseCase,
    CreateSystemMessageUseCase,
    SaveAssistantMessageUseCase,
    CreateToolResultMessageUseCase,
    DeleteMessageUseCase,
    CleanupOrphanedImagesUseCase,
    CountMessagesTokensUseCase,
    // Services
    ImageContentService,
  ],
})
export class MessagesModule {}
