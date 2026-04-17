import { forwardRef, Module } from '@nestjs/common';
import { ThreadsController } from './presenters/http/threads.controller';
import { ThreadSourcesController } from './presenters/http/thread-sources.controller';
import { ThreadKnowledgeBasesController } from './presenters/http/thread-knowledge-bases.controller';
import { ThreadsRepository } from './application/ports/threads.repository';
import { GeneratedImagesRepository } from './application/ports/generated-images.repository';
import { LocalThreadsRepositoryModule } from './infrastructure/persistence/local/local-threads-repository.module';
import { SourcesModule } from '../sources/sources.module';
import { ModelsModule } from '../models/models.module';
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
import { GenerateAndSetThreadTitleUseCase } from './application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.use-case';
import { LocalThreadsRepository } from './infrastructure/persistence/local/local-threads.repository';
import { LocalGeneratedImagesRepository } from './infrastructure/persistence/local/local-generated-images.repository';
import { GetThreadsDtoMapper } from './presenters/http/mappers/get-threads.mapper';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { ReplaceModelWithUserDefaultUseCase } from './application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { FindAllThreadsByOrgWithSourcesUseCase } from './application/use-cases/find-all-threads-by-org-with-sources/find-all-threads-by-org-with-sources.use-case';
import { AddMcpIntegrationToThreadUseCase } from './application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.use-case';
import { AddKnowledgeBaseToThreadUseCase } from './application/use-cases/add-knowledge-base-to-thread/add-knowledge-base-to-thread.use-case';
import { RemoveKnowledgeBaseFromThreadUseCase } from './application/use-cases/remove-knowledge-base-from-thread/remove-knowledge-base-from-thread.use-case';
import { RemoveSkillSourcesFromThreadsUseCase } from './application/use-cases/remove-skill-sources-from-threads/remove-skill-sources-from-threads.use-case';
import { RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase } from './application/use-cases/remove-knowledge-base-assignments-by-origin-skill/remove-knowledge-base-assignments-by-origin-skill.use-case';
import { RemoveDirectKnowledgeBaseFromThreadsUseCase } from './application/use-cases/remove-direct-knowledge-base-from-threads/remove-direct-knowledge-base-from-threads.use-case';
import { SaveGeneratedImageUseCase } from './application/use-cases/save-generated-image/save-generated-image.use-case';
import { ResolveGeneratedImageUseCase } from './application/use-cases/resolve-generated-image/resolve-generated-image.use-case';
import { GeneratedImagesController } from './presenters/http/generated-images.controller';
import { ShareDeletedListener } from './application/listeners/share-deleted.listener';
import { CleanupStaleThreadSourcesUseCase } from './application/use-cases/cleanup-stale-thread-sources/cleanup-stale-thread-sources.use-case';
import { StaleThreadSourcesCleanupTask } from './infrastructure/tasks/stale-thread-sources-cleanup.task';
import { AgentsModule } from '../agents/agents.module';
import { KnowledgeBasesModule } from '../knowledge-bases/knowledge-bases.module';
import { StorageModule } from '../storage/storage.module';
import { MessagesModule } from '../messages/messages.module';
import { SharesModule } from '../shares/shares.module';
@Module({
  imports: [
    LocalThreadsRepositoryModule,
    SourcesModule,
    forwardRef(() => ModelsModule),
    forwardRef(() => AgentsModule),
    KnowledgeBasesModule,
    MessagesModule,
    OrgsModule,
    StorageModule,
    SharesModule,
  ],
  controllers: [
    ThreadsController,
    ThreadSourcesController,
    ThreadKnowledgeBasesController,
    GeneratedImagesController,
  ],
  providers: [
    {
      provide: ThreadsRepository,
      useExisting: LocalThreadsRepository,
    },
    {
      provide: GeneratedImagesRepository,
      useExisting: LocalGeneratedImagesRepository,
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
    GenerateAndSetThreadTitleUseCase,
    ReplaceModelWithUserDefaultUseCase,
    FindAllThreadsByOrgWithSourcesUseCase,
    AddMcpIntegrationToThreadUseCase,
    AddKnowledgeBaseToThreadUseCase,
    RemoveKnowledgeBaseFromThreadUseCase,
    RemoveSkillSourcesFromThreadsUseCase,
    RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase,
    RemoveDirectKnowledgeBaseFromThreadsUseCase,
    SaveGeneratedImageUseCase,
    ResolveGeneratedImageUseCase,
    CleanupStaleThreadSourcesUseCase,
    // Listeners
    ShareDeletedListener,
    // Tasks
    StaleThreadSourcesCleanupTask,
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
    FindAllThreadsByOrgWithSourcesUseCase,
    AddMcpIntegrationToThreadUseCase,
    AddKnowledgeBaseToThreadUseCase,
    RemoveKnowledgeBaseFromThreadUseCase,
    RemoveSkillSourcesFromThreadsUseCase,
    RemoveKnowledgeBaseAssignmentsByOriginSkillUseCase,
    RemoveDirectKnowledgeBaseFromThreadsUseCase,
    SaveGeneratedImageUseCase,
    // Export mappers
    GetThreadDtoMapper,
    GetThreadsDtoMapper,
    MessageDtoMapper,
  ],
})
export class ThreadsModule {}
