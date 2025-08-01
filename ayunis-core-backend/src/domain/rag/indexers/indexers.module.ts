import { Module } from '@nestjs/common';
import { ParentChildIndexerModule } from './infrastructure/adapters/parent-child-index/parent-child-indexer.module';
import { IngestContentUseCase } from './application/use-cases/ingest-content/ingest-content.use-case';
import { SearchContentUseCase } from './application/use-cases/search-content/search-content.use-case';
import { DeleteContentUseCase } from './application/use-cases/delete-content/delete-content.use-case';
import { IndexRegistry } from './application/indexer.registry';

@Module({
  imports: [ParentChildIndexerModule],
  providers: [
    IndexRegistry,
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
