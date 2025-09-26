import { Module } from '@nestjs/common';
import { LocalSourceRepositoryModule } from './infrastructure/persistence/local/local-source-repository.module';
import { SplitterModule } from '../rag/splitters/splitter.module';
import { RetrieverModule } from '../retrievers/retriever.module';
import { IndexersModule } from '../rag/indexers/indexers.module';

// Import all use cases
import { GetTextSourceByIdUseCase } from './application/use-cases/get-text-source-by-id/get-text-source-by-id.use-case';
import { GetSourceByIdUseCase } from './application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { DeleteSourceUseCase } from './application/use-cases/delete-source/delete-source.use-case';
import { CreateTextSourceUseCase } from './application/use-cases/create-text-source/create-text-source.use-case';
import { QueryTextSourceUseCase } from './application/use-cases/query-text-source/query-text-source.use-case';
import { CreateDataSourceUseCase } from './application/use-cases/create-data-source/create-data-source.use-case';

@Module({
  imports: [
    LocalSourceRepositoryModule,
    RetrieverModule,
    SplitterModule,
    IndexersModule,
  ],
  providers: [
    GetTextSourceByIdUseCase,
    GetSourceByIdUseCase,
    DeleteSourceUseCase,
    CreateTextSourceUseCase,
    CreateDataSourceUseCase,
    QueryTextSourceUseCase,
  ],
  exports: [
    GetTextSourceByIdUseCase,
    GetSourceByIdUseCase,
    DeleteSourceUseCase,
    CreateTextSourceUseCase,
    CreateDataSourceUseCase,
    QueryTextSourceUseCase,
  ],
})
export class SourcesModule {}
