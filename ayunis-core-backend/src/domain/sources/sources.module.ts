import { forwardRef, Module } from '@nestjs/common';
import { LocalSourceRepositoryModule } from './infrastructure/persistence/local/local-source-repository.module';
import { ModelsModule } from '../models/models.module';
import { SplitterModule } from '../rag/splitters/splitter.module';
import { RetrieverModule } from '../retrievers/retriever.module';
import { IndexersModule } from '../rag/indexers/indexers.module';
import { StorageModule } from '../storage/storage.module';
import { DocumentProcessingModule } from './infrastructure/queue/document-processing.module';
import { DataSourceProcessingModule } from './infrastructure/queue/data-source-processing.module';
import { UrlCrawlModule } from './infrastructure/queue/url-crawl.module';
import { SpreadsheetParsingModule } from './infrastructure/parsing/spreadsheet-parsing.module';

// Import all use cases
import { GetTextSourceByIdUseCase } from './application/use-cases/get-text-source-by-id/get-text-source-by-id.use-case';
import { GetSourceByIdUseCase } from './application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { DeleteSourceUseCase } from './application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourcesUseCase } from './application/use-cases/delete-sources/delete-sources.use-case';
import { CleanupSourceProcessingUseCase } from './application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { CreateTextSourceUseCase } from './application/use-cases/create-text-source/create-text-source.use-case';
import { QueryTextSourceUseCase } from './application/use-cases/query-text-source/query-text-source.use-case';
import { CreateDataSourceUseCase } from './application/use-cases/create-data-source/create-data-source.use-case';
import { GetSourcesByIdsUseCase } from './application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { FindContentChunksByIdsUseCase } from './application/use-cases/find-content-chunks-by-ids/find-content-chunks-by-ids.use-case';
import { ExtractTextLinesUseCase } from './application/use-cases/extract-text-lines/extract-text-lines.use-case';
import { GetSourcesByKnowledgeBaseIdUseCase } from './application/use-cases/get-sources-by-knowledge-base-id/get-sources-by-knowledge-base-id.use-case';
import { CreateProcessingSourceUseCase } from './application/use-cases/create-processing-source/create-processing-source.use-case';
import { MarkSourceFailedUseCase } from './application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { EnqueueDocumentProcessingUseCase } from './application/use-cases/enqueue-document-processing/enqueue-document-processing.use-case';
import { StartDocumentProcessingUseCase } from './application/use-cases/start-document-processing/start-document-processing.use-case';
import { StartDataSourceProcessingUseCase } from './application/use-cases/start-data-source-processing/start-data-source-processing.use-case';
import { EnqueueDataSourceProcessingUseCase } from './application/use-cases/enqueue-data-source-processing/enqueue-data-source-processing.use-case';
import { FindUnreferencedSourceIdsUseCase } from './application/use-cases/find-unreferenced-source-ids/find-unreferenced-source-ids.use-case';
import { CreateProcessingUrlSourceUseCase } from './application/use-cases/create-processing-url-source/create-processing-url-source.use-case';
import { EnqueueUrlCrawlUseCase } from './application/use-cases/enqueue-url-crawl/enqueue-url-crawl.use-case';
import { StartUrlCrawlUseCase } from './application/use-cases/start-url-crawl/start-url-crawl.use-case';

@Module({
  imports: [
    LocalSourceRepositoryModule,
    RetrieverModule,
    SplitterModule,
    IndexersModule,
    StorageModule,
    DocumentProcessingModule,
    DataSourceProcessingModule,
    UrlCrawlModule,
    SpreadsheetParsingModule,
    forwardRef(() => ModelsModule), // Models → Sources → Models (circular)
  ],
  providers: [
    GetTextSourceByIdUseCase,
    GetSourceByIdUseCase,
    DeleteSourceUseCase,
    DeleteSourcesUseCase,
    CleanupSourceProcessingUseCase,
    CreateTextSourceUseCase,
    CreateDataSourceUseCase,
    GetSourcesByIdsUseCase,
    QueryTextSourceUseCase,
    FindContentChunksByIdsUseCase,
    ExtractTextLinesUseCase,
    GetSourcesByKnowledgeBaseIdUseCase,
    CreateProcessingSourceUseCase,
    MarkSourceFailedUseCase,
    EnqueueDocumentProcessingUseCase,
    StartDocumentProcessingUseCase,
    StartDataSourceProcessingUseCase,
    EnqueueDataSourceProcessingUseCase,
    FindUnreferencedSourceIdsUseCase,
    CreateProcessingUrlSourceUseCase,
    EnqueueUrlCrawlUseCase,
    StartUrlCrawlUseCase,
  ],
  exports: [
    LocalSourceRepositoryModule,
    DocumentProcessingModule,
    DataSourceProcessingModule,
    UrlCrawlModule,
    GetTextSourceByIdUseCase,
    GetSourceByIdUseCase,
    DeleteSourceUseCase,
    DeleteSourcesUseCase,
    CleanupSourceProcessingUseCase,
    CreateTextSourceUseCase,
    CreateDataSourceUseCase,
    GetSourcesByIdsUseCase,
    QueryTextSourceUseCase,
    FindContentChunksByIdsUseCase,
    ExtractTextLinesUseCase,
    GetSourcesByKnowledgeBaseIdUseCase,
    CreateProcessingSourceUseCase,
    MarkSourceFailedUseCase,
    EnqueueDocumentProcessingUseCase,
    StartDocumentProcessingUseCase,
    StartDataSourceProcessingUseCase,
    EnqueueDataSourceProcessingUseCase,
    FindUnreferencedSourceIdsUseCase,
    CreateProcessingUrlSourceUseCase,
    EnqueueUrlCrawlUseCase,
    StartUrlCrawlUseCase,
  ],
})
export class SourcesModule {}
