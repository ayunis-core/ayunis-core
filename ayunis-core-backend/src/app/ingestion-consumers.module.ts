import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import transcriptionConfig from 'src/config/transcription.config';
import { ContextModule } from 'src/common/context/context.module';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { RetrieverModule } from 'src/domain/retrievers/retriever.module';
import { SplitterModule } from 'src/domain/rag/splitters/splitter.module';
import { IndexersModule } from 'src/domain/rag/indexers/indexers.module';
import { StorageModule } from 'src/domain/storage/storage.module';
import { SpreadsheetParsingModule } from 'src/domain/sources/infrastructure/parsing/spreadsheet-parsing.module';
import { LocalSourceRepositoryModule } from 'src/domain/sources/infrastructure/persistence/local/local-source-repository.module';
import { StoredSourceFileService } from 'src/domain/sources/application/services/stored-source-file.service';
import { ProcessingCheckpointService } from 'src/domain/sources/application/services/processing-checkpoint.service';
import { SourceProcessingHeartbeatService } from 'src/domain/sources/application/services/source-processing-heartbeat.service';
import { SourceProcessingHelper } from 'src/domain/sources/application/services/source-processing-helper.service';
import { CrawledPdfSourcesService } from 'src/domain/sources/application/services/crawled-pdf-sources.service';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { DocumentProcessingModule } from 'src/domain/sources/infrastructure/queue/document-processing.module';
import { DataSourceProcessingModule } from 'src/domain/sources/infrastructure/queue/data-source-processing.module';
import { UrlCrawlModule } from 'src/domain/sources/infrastructure/queue/url-crawl.module';
import { DocumentProcessingConsumer } from 'src/domain/sources/infrastructure/queue/document-processing.consumer';
import { DataSourceProcessingConsumer } from 'src/domain/sources/infrastructure/queue/data-source-processing.consumer';
import { UrlCrawlConsumer } from 'src/domain/sources/infrastructure/queue/url-crawl.consumer';
import { DOCUMENT_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/document-processing.constants';
import { DATA_SOURCE_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/data-source-processing.constants';
import { URL_CRAWL_QUEUE } from 'src/domain/sources/infrastructure/queue/url-crawl.constants';

/** The queues this module's consumers serve; a worker's health check requires them all. */
export const INGESTION_QUEUES = [
  DOCUMENT_PROCESSING_QUEUE,
  DATA_SOURCE_PROCESSING_QUEUE,
  URL_CRAWL_QUEUE,
] as const;

/**
 * Everything that works through the ingestion queues. The worker imports it
 * unconditionally; the API imports it only while it processes files itself
 * (INGESTION_IN_API). Scheduled cleanup is not part of it and stays on the API.
 */
@Module({
  imports: [
    // The document consumer stages recordings under the transcription temp directory.
    ConfigModule.forFeature(transcriptionConfig),
    OrgsModule,
    DocumentProcessingModule,
    DataSourceProcessingModule,
    UrlCrawlModule,
    RetrieverModule,
    SplitterModule,
    IndexersModule,
    StorageModule,
    ContextModule,
    SpreadsheetParsingModule,
    LocalSourceRepositoryModule,
  ],
  providers: [
    StoredSourceFileService,
    ProcessingCheckpointService,
    SourceProcessingHeartbeatService,
    SourceProcessingHelper,
    CrawledPdfSourcesService,
    MarkSourceFailedUseCase,
    DocumentProcessingConsumer,
    DataSourceProcessingConsumer,
    UrlCrawlConsumer,
  ],
})
export class IngestionConsumersModule {}
