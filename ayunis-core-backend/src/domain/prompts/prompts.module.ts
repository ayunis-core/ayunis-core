import { Module } from '@nestjs/common';
import { PromptsController } from './presenters/http/prompts.controller';
import { PromptsRepository } from './application/ports/prompts.repository';
import { LocalPromptsRepositoryModule } from './infrastructure/persistence/local/local-prompts-repository.module';
import { LocalPromptsRepository } from './infrastructure/persistence/local/local-prompts.repository';

// Import all use cases
import { CreatePromptUseCase } from './application/use-cases/create-prompt/create-prompt.use-case';
import { UpdatePromptUseCase } from './application/use-cases/update-prompt/update-prompt.use-case';
import { DeletePromptUseCase } from './application/use-cases/delete-prompt/delete-prompt.use-case';
import { GetPromptUseCase } from './application/use-cases/get-prompt/get-prompt.use-case';
import { GetAllPromptsByUserUseCase } from './application/use-cases/get-all-prompts-by-user/get-all-prompts-by-user.use-case';

// Import mappers
import { PromptDtoMapper } from './presenters/http/mappers/prompt.mapper';

@Module({
  imports: [LocalPromptsRepositoryModule],
  controllers: [PromptsController],
  providers: [
    {
      provide: PromptsRepository,
      useExisting: LocalPromptsRepository,
    },
    // Use cases
    CreatePromptUseCase,
    UpdatePromptUseCase,
    DeletePromptUseCase,
    GetPromptUseCase,
    GetAllPromptsByUserUseCase,

    // Mappers
    PromptDtoMapper,
  ],
  exports: [
    // Export use cases
    CreatePromptUseCase,
    UpdatePromptUseCase,
    DeletePromptUseCase,
    GetPromptUseCase,
    GetAllPromptsByUserUseCase,

    // Export mappers
    PromptDtoMapper,
  ],
})
export class PromptsModule {}
