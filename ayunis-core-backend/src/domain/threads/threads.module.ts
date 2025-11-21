import { forwardRef, Module } from '@nestjs/common';
import { ThreadsController } from './presenters/http/threads.controller';
import { ThreadsRepository } from './application/ports/threads.repository';
import { LocalThreadsRepositoryModule } from './infrastructure/persistence/local/local-threads-repository.module';
import { SourcesModule } from '../sources/sources.module';
import { ModelsModule } from '../models/models.module';
import { MessagesModule } from '../messages/messages.module';
import { SourceDtoMapper } from './presenters/http/mappers/source.mapper';
import { GetThreadDtoMapper } from './presenters/http/mappers/get-thread.mapper';
import { MessageDtoMapper } from './presenters/http/mappers/message.mapper';

// Import all use cases
import { CreateThreadUseCase } from './application/use-cases/create-thread/create-thread.use-case';
import { FindThreadUseCase } from './application/use-cases/find-thread/find-thread.use-case';
import { FindAllThreadsUseCase } from './application/use-cases/find-all-threads/find-all-threads.use-case';
import { DeleteThreadUseCase } from './application/use-cases/delete-thread/delete-thread.use-case';
import { AddMessageToThreadUseCase } from './application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import { AddSourceToThreadUseCase } from './application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { RemoveSourceFromThreadUseCase } from './application/use-cases/remove-source-from-thread/remove-source-from-thread.use-case';
import { GetThreadSourcesUseCase } from './application/use-cases/get-thread-sources/get-thread-sources.use-case';
import { UpdateThreadTitleUseCase } from './application/use-cases/update-thread-title/update-thread-title.use-case';
import { UpdateThreadModelUseCase } from './application/use-cases/update-thread-model/update-thread-model.use-case';
import { GenerateAndSetThreadTitleUseCase } from './application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.use-case';
import { LocalThreadsRepository } from './infrastructure/persistence/local/local-threads.repository';
import { GetThreadsDtoMapper } from './presenters/http/mappers/get-threads.mapper';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { ReplaceModelWithUserDefaultUseCase } from './application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { ReplaceAgentWithDefaultModelUseCase } from './application/use-cases/replace-agent-with-default-model/replace-agent-with-default-model.use-case';
import { AgentsModule } from '../agents/agents.module';
import { UpdateThreadAgentUseCase } from './application/use-cases/update-thread-agent/update-thread-agent.use-case';
import { RemoveAgentFromThreadUseCase } from './application/use-cases/remove-agent-from-thread/remove-agent-from-thread.use-case';

@Module({
  imports: [
    LocalThreadsRepositoryModule,
    SourcesModule,
    forwardRef(() => ModelsModule),
    forwardRef(() => AgentsModule),
    MessagesModule,
    OrgsModule,
  ],
  controllers: [ThreadsController],
  providers: [
    {
      provide: ThreadsRepository,
      useExisting: LocalThreadsRepository,
    },
    // Use cases
    CreateThreadUseCase,
    FindThreadUseCase,
    FindAllThreadsUseCase,
    DeleteThreadUseCase,
    AddMessageToThreadUseCase,
    AddSourceToThreadUseCase,
    RemoveSourceFromThreadUseCase,
    GetThreadSourcesUseCase,
    UpdateThreadTitleUseCase,
    UpdateThreadModelUseCase,
    UpdateThreadAgentUseCase,
    GenerateAndSetThreadTitleUseCase,
    ReplaceModelWithUserDefaultUseCase,
    ReplaceAgentWithDefaultModelUseCase,
    RemoveAgentFromThreadUseCase,
    // Mappers
    SourceDtoMapper,
    GetThreadDtoMapper,
    GetThreadsDtoMapper,
    MessageDtoMapper,
  ],
  exports: [
    // Export use cases
    FindThreadUseCase,
    FindAllThreadsUseCase,
    AddMessageToThreadUseCase,
    AddSourceToThreadUseCase,
    RemoveSourceFromThreadUseCase,
    GetThreadSourcesUseCase,
    UpdateThreadTitleUseCase,
    GenerateAndSetThreadTitleUseCase,
    ReplaceModelWithUserDefaultUseCase,
    ReplaceAgentWithDefaultModelUseCase,
    // Export mappers
    GetThreadDtoMapper,
    GetThreadsDtoMapper,
    MessageDtoMapper,
  ],
})
export class ThreadsModule {}
