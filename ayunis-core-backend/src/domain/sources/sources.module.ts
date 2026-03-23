import { Module } from '@nestjs/common';
import { LocalSourceRepositoryModule } from './infrastructure/persistence/local/local-source-repository.module';
import { SplitterModule } from '../rag/splitters/splitter.module';
import { RetrieverModule } from '../retrievers/retriever.module';
import { IndexersModule } from '../rag/indexers/indexers.module';

// Import all use cases
import { GetTextSourceByIdUseCase } from './application/use-cases/get-text-source-by-id/get-text-source-by-id.use-case';
import { GetSourceByIdUseCase } from './application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { DeleteSourceUseCase } from './application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourcesUseCase } from './application/use-cases/delete-sources/delete-sources.use-case';
import { CreateTextSourceUseCase } from './application/use-cases/create-text-source/create-text-source.use-case';
import { QueryTextSourceUseCase } from './application/use-cases/query-text-source/query-text-source.use-case';
import { CreateDataSourceUseCase } from './application/use-cases/create-data-source/create-data-source.use-case';
import { GetSourcesByIdsUseCase } from './application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { FindContentChunksByIdsUseCase } from './application/use-cases/find-content-chunks-by-ids/find-content-chunks-by-ids.use-case';
import { ExtractTextLinesUseCase } from './application/use-cases/extract-text-lines/extract-text-lines.use-case';
import { GetSourcesByKnowledgeBaseIdUseCase } from './application/use-cases/get-sources-by-knowledge-base-id/get-sources-by-knowledge-base-id.use-case';

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
    DeleteSourcesUseCase,
    CreateTextSourceUseCase,
    CreateDataSourceUseCase,
    GetSourcesByIdsUseCase,
    QueryTextSourceUseCase,
    FindContentChunksByIdsUseCase,
    ExtractTextLinesUseCase,
    GetSourcesByKnowledgeBaseIdUseCase,
  ],
  exports: [
    LocalSourceRepositoryModule,
    GetTextSourceByIdUseCase,
    GetSourceByIdUseCase,
    DeleteSourceUseCase,
    DeleteSourcesUseCase,
    CreateTextSourceUseCase,
    CreateDataSourceUseCase,
    GetSourcesByIdsUseCase,
    QueryTextSourceUseCase,
    FindContentChunksByIdsUseCase,
    ExtractTextLinesUseCase,
    GetSourcesByKnowledgeBaseIdUseCase,
  ],
})
export class SourcesModule {}
