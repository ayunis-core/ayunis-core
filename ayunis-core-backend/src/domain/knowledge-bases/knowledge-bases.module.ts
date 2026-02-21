import { Module } from '@nestjs/common';
import { LocalKnowledgeBaseRepositoryModule } from './infrastructure/persistence/local/local-knowledge-base-repository.module';
import { SourcesModule } from '../sources/sources.module';

// Use Cases
import { CreateKnowledgeBaseUseCase } from './application/use-cases/create-knowledge-base/create-knowledge-base.use-case';
import { UpdateKnowledgeBaseUseCase } from './application/use-cases/update-knowledge-base/update-knowledge-base.use-case';
import { DeleteKnowledgeBaseUseCase } from './application/use-cases/delete-knowledge-base/delete-knowledge-base.use-case';
import { FindKnowledgeBaseUseCase } from './application/use-cases/find-knowledge-base/find-knowledge-base.use-case';
import { ListKnowledgeBasesUseCase } from './application/use-cases/list-knowledge-bases/list-knowledge-bases.use-case';

// Presenters
import { KnowledgeBasesController } from './presenters/http/knowledge-bases.controller';
import { KnowledgeBaseDtoMapper } from './presenters/http/mappers/knowledge-base-dto.mapper';

@Module({
  imports: [LocalKnowledgeBaseRepositoryModule, SourcesModule],
  providers: [
    // Use Cases
    CreateKnowledgeBaseUseCase,
    UpdateKnowledgeBaseUseCase,
    DeleteKnowledgeBaseUseCase,
    FindKnowledgeBaseUseCase,
    ListKnowledgeBasesUseCase,
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
  ],
})
export class KnowledgeBasesModule {}
