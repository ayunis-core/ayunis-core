import { Module } from '@nestjs/common';
import { ParentChildIndexerModule } from './infrastructure/adapters/parent-child-index/parent-child-indexer.module';
import { IngestContentUseCase } from './application/use-cases/ingest-content/ingest-content.use-case';
import { SearchContentUseCase } from './application/use-cases/search-content/search-content.use-case';
import { DeleteContentUseCase } from './application/use-cases/delete-content/delete-content.use-case';
import { IndexRegistry } from './application/indexer.registry';
import { ParentChildIndexerAdapter } from './infrastructure/adapters/parent-child-index/application/parent-child-indexer.adapter';
import { IndexType } from './domain/value-objects/index-type.enum';

@Module({
  imports: [ParentChildIndexerModule],
  providers: [
    {
      provide: IndexRegistry,
      useFactory: (parentChildIndexer: ParentChildIndexerAdapter) => {
        const indexerRegistry = new IndexRegistry();
        indexerRegistry.register(IndexType.PARENT_CHILD, parentChildIndexer);
        return indexerRegistry;
      },
      inject: [ParentChildIndexerAdapter],
    },
    IngestContentUseCase,
    SearchContentUseCase,
    DeleteContentUseCase,
  ],
  exports: [
    IndexRegistry,
    IngestContentUseCase,
    SearchContentUseCase,
    DeleteContentUseCase,
  ],
})
export class IndexersModule {}
