import { forwardRef, Module } from '@nestjs/common';
import { LocalKnowledgeBaseRepositoryModule } from './infrastructure/persistence/local/local-knowledge-base-repository.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { IndexersModule } from 'src/domain/rag/indexers/indexers.module';
import { ContextModule } from 'src/common/context/context.module';
import { StorageModule } from 'src/domain/storage/storage.module';
import { SharesModule } from 'src/domain/shares/shares.module';
import { getShareAuthStrategyToken } from 'src/domain/shares/application/factories/share-authorization.factory';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { KnowledgeBaseShareAuthorizationStrategy } from './application/strategies/knowledge-base-share-authorization.strategy';
import { KnowledgeBaseAccessService } from './application/services/knowledge-base-access.service';
import { KnowledgeBaseShareDeletedListener } from './application/listeners/share-deleted.listener';
import { KnowledgeBasesUserDeletionRequestedListener } from './application/listeners/user-deletion-requested.listener';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { ThreadsModule } from 'src/domain/threads/threads.module';

// Use Cases
import { CreateKnowledgeBaseUseCase } from './application/use-cases/create-knowledge-base/create-knowledge-base.use-case';
import { UpdateKnowledgeBaseUseCase } from './application/use-cases/update-knowledge-base/update-knowledge-base.use-case';
import { DeleteKnowledgeBaseUseCase } from './application/use-cases/delete-knowledge-base/delete-knowledge-base.use-case';
import { FindKnowledgeBaseUseCase } from './application/use-cases/find-knowledge-base/find-knowledge-base.use-case';
import { ListKnowledgeBasesUseCase } from './application/use-cases/list-knowledge-bases/list-knowledge-bases.use-case';
import { AddDocumentToKnowledgeBaseUseCase } from './application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.use-case';
import { AddUrlToKnowledgeBaseUseCase } from './application/use-cases/add-url-to-knowledge-base/add-url-to-knowledge-base.use-case';
import { RemoveDocumentFromKnowledgeBaseUseCase } from './application/use-cases/remove-document-from-knowledge-base/remove-document-from-knowledge-base.use-case';
import { ListKnowledgeBaseDocumentsUseCase } from './application/use-cases/list-knowledge-base-documents/list-knowledge-base-documents.use-case';
import { QueryKnowledgeBaseUseCase } from './application/use-cases/query-knowledge-base/query-knowledge-base.use-case';
import { GetKnowledgeBaseDocumentTextUseCase } from './application/use-cases/get-knowledge-base-document-text/get-knowledge-base-document-text.use-case';
import { GetKnowledgeBasesByIdsUseCase } from './application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.use-case';
import { SetKnowledgeBaseActivationUseCase } from './application/use-cases/set-knowledge-base-activation/set-knowledge-base-activation.use-case';
import { FindActiveKnowledgeBasesUseCase } from './application/use-cases/find-active-knowledge-bases/find-active-knowledge-bases.use-case';

// Presenters
import { KnowledgeBasesController } from './presenters/http/knowledge-bases.controller';
import { KnowledgeBaseDtoMapper } from './presenters/http/mappers/knowledge-base-dto.mapper';

@Module({
  imports: [
    LocalKnowledgeBaseRepositoryModule,
    SourcesModule,
    IndexersModule,
    ContextModule,
    StorageModule,
    forwardRef(() => SharesModule),
    forwardRef(() => SkillsModule),
    forwardRef(() => ThreadsModule),
  ],
  providers: [
    // Use Cases
    CreateKnowledgeBaseUseCase,
    UpdateKnowledgeBaseUseCase,
    DeleteKnowledgeBaseUseCase,
    FindKnowledgeBaseUseCase,
    ListKnowledgeBasesUseCase,
    AddDocumentToKnowledgeBaseUseCase,
    AddUrlToKnowledgeBaseUseCase,
    RemoveDocumentFromKnowledgeBaseUseCase,
    ListKnowledgeBaseDocumentsUseCase,
    QueryKnowledgeBaseUseCase,
    GetKnowledgeBaseDocumentTextUseCase,
    GetKnowledgeBasesByIdsUseCase,
    SetKnowledgeBaseActivationUseCase,
    FindActiveKnowledgeBasesUseCase,
    // Presenters
    KnowledgeBaseDtoMapper,
    // Services
    KnowledgeBaseAccessService,
    // Listeners
    KnowledgeBaseShareDeletedListener,
    KnowledgeBasesUserDeletionRequestedListener,
    // Strategies
    KnowledgeBaseShareAuthorizationStrategy,
    {
      provide: getShareAuthStrategyToken(SharedEntityType.KNOWLEDGE_BASE),
      useExisting: KnowledgeBaseShareAuthorizationStrategy,
    },
  ],
  controllers: [KnowledgeBasesController],
  exports: [
    LocalKnowledgeBaseRepositoryModule,
    KnowledgeBaseAccessService,
    KnowledgeBaseShareAuthorizationStrategy,
    getShareAuthStrategyToken(SharedEntityType.KNOWLEDGE_BASE),
    CreateKnowledgeBaseUseCase,
    UpdateKnowledgeBaseUseCase,
    DeleteKnowledgeBaseUseCase,
    FindKnowledgeBaseUseCase,
    ListKnowledgeBasesUseCase,
    AddDocumentToKnowledgeBaseUseCase,
    AddUrlToKnowledgeBaseUseCase,
    RemoveDocumentFromKnowledgeBaseUseCase,
    ListKnowledgeBaseDocumentsUseCase,
    QueryKnowledgeBaseUseCase,
    GetKnowledgeBaseDocumentTextUseCase,
    GetKnowledgeBasesByIdsUseCase,
    FindActiveKnowledgeBasesUseCase,
  ],
})
export class KnowledgeBasesModule {}
