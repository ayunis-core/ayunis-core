import { Module } from '@nestjs/common';
import { LocalSourceRepositoryModule } from './infrastructure/persistence/local/local-source-repository.module';
import { SplitterModule } from '../rag/splitters/splitter.module';
import { RetrieverModule } from '../retrievers/retriever.module';
import { IndexersModule } from '../rag/indexers/indexers.module';

// Import all use cases
import { GetSourceByIdUseCase } from './application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { DeleteSourceUseCase } from './application/use-cases/delete-source/delete-source.use-case';
import { CreateFileSourceUseCase } from './application/use-cases/create-file-source/create-file-source.use-case';
import { CreateUrlSourceUseCase } from './application/use-cases/create-url-source/create-url-source.use-case';
import { QuerySourceUseCase } from './application/use-cases/query-source/query-source.use-case';

@Module({
  imports: [
    LocalSourceRepositoryModule,
    RetrieverModule,
    SplitterModule,
    IndexersModule,
  ],
  providers: [
    GetSourceByIdUseCase,
    DeleteSourceUseCase,
    CreateFileSourceUseCase,
    CreateUrlSourceUseCase,
    QuerySourceUseCase,
  ],
  exports: [
    GetSourceByIdUseCase,
    DeleteSourceUseCase,
    CreateFileSourceUseCase,
    CreateUrlSourceUseCase,
    QuerySourceUseCase,
  ],
})
export class SourcesModule {}
