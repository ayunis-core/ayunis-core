import { Module } from '@nestjs/common';
import { LocalKnowledgeBaseRepositoryModule } from './infrastructure/persistence/local/local-knowledge-base-repository.module';
import { SourcesModule } from '../sources/sources.module';
import { IndexersModule } from '../rag/indexers/indexers.module';
import { ContextModule } from 'src/common/context/context.module';

// Use Cases
import { CreateKnowledgeBaseUseCase } from './application/use-cases/create-knowledge-base/create-knowledge-base.use-case';
import { UpdateKnowledgeBaseUseCase } from './application/use-cases/update-knowledge-base/update-knowledge-base.use-case';
import { DeleteKnowledgeBaseUseCase } from './application/use-cases/delete-knowledge-base/delete-knowledge-base.use-case';
import { FindKnowledgeBaseUseCase } from './application/use-cases/find-knowledge-base/find-knowledge-base.use-case';
import { ListKnowledgeBasesUseCase } from './application/use-cases/list-knowledge-bases/list-knowledge-bases.use-case';
import { AddDocumentToKnowledgeBaseUseCase } from './application/use-cases/add-document-to-knowledge-base/add-document-to-knowledge-base.use-case';
import { RemoveDocumentFromKnowledgeBaseUseCase } from './application/use-cases/remove-document-from-knowledge-base/remove-document-from-knowledge-base.use-case';
import { ListKnowledgeBaseDocumentsUseCase } from './application/use-cases/list-knowledge-base-documents/list-knowledge-base-documents.use-case';
import { QueryKnowledgeBaseUseCase } from './application/use-cases/query-knowledge-base/query-knowledge-base.use-case';
import { GetKnowledgeBaseDocumentTextUseCase } from './application/use-cases/get-knowledge-base-document-text/get-knowledge-base-document-text.use-case';

// Presenters
import { KnowledgeBasesController } from './presenters/http/knowledge-bases.controller';
import { KnowledgeBaseDtoMapper } from './presenters/http/mappers/knowledge-base-dto.mapper';

@Module({
  imports: [
    LocalKnowledgeBaseRepositoryModule,
    SourcesModule,
    IndexersModule,
    ContextModule,
  ],
  providers: [
    // Use Cases
    CreateKnowledgeBaseUseCase,
    UpdateKnowledgeBaseUseCase,
    DeleteKnowledgeBaseUseCase,
    FindKnowledgeBaseUseCase,
    ListKnowledgeBasesUseCase,
    AddDocumentToKnowledgeBaseUseCase,
    RemoveDocumentFromKnowledgeBaseUseCase,
    ListKnowledgeBaseDocumentsUseCase,
    QueryKnowledgeBaseUseCase,
    GetKnowledgeBaseDocumentTextUseCase,
    // Presenters
    KnowledgeBaseDtoMapper,
  ],
  controllers: [KnowledgeBasesController],
  exports: [
    LocalKnowledgeBaseRepositoryModule,
    CreateKnowledgeBaseUseCase,
    UpdateKnowledgeBaseUseCase,
    DeleteKnowledgeBaseUseCase,
    FindKnowledgeBaseUseCase,
    ListKnowledgeBasesUseCase,
    AddDocumentToKnowledgeBaseUseCase,
    RemoveDocumentFromKnowledgeBaseUseCase,
    ListKnowledgeBaseDocumentsUseCase,
    QueryKnowledgeBaseUseCase,
    GetKnowledgeBaseDocumentTextUseCase,
  ],
})
export class KnowledgeBasesModule {}
