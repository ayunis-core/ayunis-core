import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmbeddingsModule } from 'src/domain/rag/embeddings/embeddings.module';

// Entities
import { ParentChunkRecord } from './infrastructure/persistence/schema/parent-chunk.record';
import { ChildChunkRecord } from './infrastructure/persistence/schema/child-chunk.record';

// Mappers
import { ParentChildIndexerMapper } from './infrastructure/persistence/mappers/parent-child-indexer.mapper';

// Repository
import { ParentChildIndexerRepository } from './parent-child-index.repository';
import { ParentChildIndexerRepositoryPort } from './application/ports/parent-child-indexer-repository.port';

// Use Cases
import { IngestContentUseCase } from './application/use-cases/ingest-content/ingest-content.use-case';
import { SearchContentUseCase } from './application/use-cases/search-content/search-content.use-case';
import { DeleteContentUseCase } from './application/use-cases/delete-content/delete-content.use-case';

// Adapter
import { ParentChildIndexerAdapter } from './application/parent-child-indexer.adapter';

// Splitter
import { SplitterModule } from 'src/domain/rag/splitters/splitter.module';
import { ModelsModule } from 'src/domain/models/models.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParentChunkRecord, ChildChunkRecord]),
    EmbeddingsModule,
    SplitterModule,
    forwardRef(() => ModelsModule),
  ],
  providers: [
    // Repository
    ParentChildIndexerRepository,
    {
      provide: ParentChildIndexerRepositoryPort,
      useExisting: ParentChildIndexerRepository,
    },

    // Mappers
    ParentChildIndexerMapper,

    // Use Cases
    IngestContentUseCase,
    SearchContentUseCase,
    DeleteContentUseCase,

    // Adapter
    ParentChildIndexerAdapter,
  ],
  exports: [
    ParentChildIndexerAdapter,
    IngestContentUseCase,
    SearchContentUseCase,
    DeleteContentUseCase,
  ],
})
export class ParentChildIndexerModule {}
