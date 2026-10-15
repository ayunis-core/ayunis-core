import { FindKnowledgeBaseForThreadUseCase } from './application/use-cases/find-knowledge-base-for-thread/find-knowledge-base-for-thread.use-case';
import { forwardRef, Module } from '@nestjs/common';
import { OwnershipModule } from 'src/domain/ownership/ownership.module';
import { HandoversModule } from 'src/domain/handovers/handovers.module';
import { KnowledgeBaseOwnershipContextService } from './application/services/knowledge-base-ownership-context.service';
import { TransferKnowledgeBaseOwnershipUseCase } from './application/use-cases/transfer-knowledge-base-ownership/transfer-knowledge-base-ownership.use-case';
import { LocalKnowledgeBaseRepositoryModule } from './infrastructure/persistence/local/local-knowledge-base-repository.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { IndexersModule } from 'src/domain/rag/indexers/indexers.module';
import { ContextModule } from 'src/common/context/context.module';
import { PermissionsModule } from 'src/iam/permissions/permissions.module';
import { StorageModule } from 'src/domain/storage/storage.module';
import { FindAccessibleKnowledgeBaseUseCase } from './application/use-cases/find-accessible-knowledge-base/find-accessible-knowledge-base.use-case';
import { FindAccessibleKnowledgeBasesByIdsUseCase } from './application/use-cases/find-accessible-knowledge-bases-by-ids/find-accessible-knowledge-bases-by-ids.use-case';
import { GetAccessibleKnowledgeBaseContextsUseCase } from './application/use-cases/get-accessible-knowledge-base-contexts/get-accessible-knowledge-base-contexts.use-case';
import { KnowledgeBaseWriteAccessService } from './application/services/knowledge-base-write-access.service';
import { KnowledgeBaseReadAccessService } from './application/services/knowledge-base-read-access.service';
import { WorkspacesModule } from 'src/domain/workspaces/workspaces.module';
import { CountKnowledgeBaseDocumentsUseCase } from './application/use-cases/count-knowledge-base-documents/count-knowledge-base-documents.use-case';
import { KnowledgeBasesUserDeletionRequestedListener } from './application/listeners/user-deletion-requested.listener';
import { KnowledgeBasesWorkspaceDeletionRequestedListener } from './application/listeners/workspace-deletion-requested.listener';
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
    PermissionsModule,
    StorageModule,
    forwardRef(() => SkillsModule),
    forwardRef(() => ThreadsModule),
    forwardRef(() => WorkspacesModule),
    OwnershipModule,
    forwardRef(() => HandoversModule),
  ],
  providers: [
    KnowledgeBaseOwnershipContextService,
    TransferKnowledgeBaseOwnershipUseCase,
    FindKnowledgeBaseForThreadUseCase,
    FindAccessibleKnowledgeBaseUseCase,
    FindAccessibleKnowledgeBasesByIdsUseCase,
    GetAccessibleKnowledgeBaseContextsUseCase,
    CountKnowledgeBaseDocumentsUseCase,
    KnowledgeBaseWriteAccessService,
    KnowledgeBaseReadAccessService,
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
    SetKnowledgeBaseActivationUseCase,
    FindActiveKnowledgeBasesUseCase,
    // Presenters
    KnowledgeBaseDtoMapper,
    // Listeners
    KnowledgeBasesUserDeletionRequestedListener,
    KnowledgeBasesWorkspaceDeletionRequestedListener,
  ],
  controllers: [KnowledgeBasesController],
  exports: [
    TransferKnowledgeBaseOwnershipUseCase,
    FindKnowledgeBaseForThreadUseCase,
    FindAccessibleKnowledgeBaseUseCase,
    FindAccessibleKnowledgeBasesByIdsUseCase,
    GetAccessibleKnowledgeBaseContextsUseCase,
    CountKnowledgeBaseDocumentsUseCase,
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
    FindActiveKnowledgeBasesUseCase,
  ],
})
export class KnowledgeBasesModule {}
