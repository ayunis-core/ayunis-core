import { Module } from '@nestjs/common';
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
import { UpdateThreadInstructionUseCase } from './application/use-cases/update-thread-instruction/update-thread-instruction.use-case';
import { UpdateThreadModelUseCase } from './application/use-cases/update-thread-model/update-thread-model.use-case';
import { UpdateThreadInternetSearchUseCase } from './application/use-cases/update-thread-internet-search/update-thread-internet-search.use-case';
import { GenerateAndSetThreadTitleUseCase } from './application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.use-case';
import { LocalThreadsRepository } from './infrastructure/persistence/local/local-threads.repository';
import { GetThreadsDtoMapper } from './presenters/http/mappers/get-threads.mapper';
import { OrgsModule } from 'src/iam/orgs/orgs.module';

@Module({
  imports: [
    LocalThreadsRepositoryModule,
    SourcesModule,
    ModelsModule,
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
    UpdateThreadInstructionUseCase,
    UpdateThreadModelUseCase,
    UpdateThreadInternetSearchUseCase,
    GenerateAndSetThreadTitleUseCase,

    // Mappers
    SourceDtoMapper,
    GetThreadDtoMapper,
    GetThreadsDtoMapper,
    MessageDtoMapper,
  ],
  exports: [
    // Export use cases
    CreateThreadUseCase,
    FindThreadUseCase,
    FindAllThreadsUseCase,
    DeleteThreadUseCase,
    AddMessageToThreadUseCase,
    AddSourceToThreadUseCase,
    RemoveSourceFromThreadUseCase,
    GetThreadSourcesUseCase,
    UpdateThreadTitleUseCase,
    UpdateThreadInstructionUseCase,
    UpdateThreadModelUseCase,
    UpdateThreadInternetSearchUseCase,
    GenerateAndSetThreadTitleUseCase,

    // Export mappers
    GetThreadDtoMapper,
    GetThreadsDtoMapper,
    MessageDtoMapper,
  ],
})
export class ThreadsModule {}
