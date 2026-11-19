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
import { EarlyEmbeddingService } from 'src/domain/sources/application/services/early-embedding.service';
import { CrawledPdfSourcesService } from 'src/domain/sources/application/services/crawled-pdf-sources.service';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { SourceTranscriptContentService } from 'src/domain/sources/application/services/source-transcript-content.service';
import { RecordingTranscriptExtractor } from 'src/domain/sources/infrastructure/queue/recording-transcript.extractor';
import { TranscriptionsModule } from 'src/domain/transcriptions/transcriptions.module';
import { RecordingSummaryTriggerModule } from 'src/domain/recordings/recording-summary-trigger.module';
import { DocumentProcessingModule } from 'src/domain/sources/infrastructure/queue/document-processing.module';
import { DataSourceProcessingModule } from 'src/domain/sources/infrastructure/queue/data-source-processing.module';
import { UrlCrawlModule } from 'src/domain/sources/infrastructure/queue/url-crawl.module';
import { DocumentProcessingConsumer } from 'src/domain/sources/infrastructure/queue/document-processing.consumer';
import { DocumentProcessingPipeline } from 'src/domain/sources/infrastructure/queue/document-processing.pipeline';
import { DataSourceProcessingConsumer } from 'src/domain/sources/infrastructure/queue/data-source-processing.consumer';
import { UrlCrawlConsumer } from 'src/domain/sources/infrastructure/queue/url-crawl.consumer';
import { DOCUMENT_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/document-processing.constants';
import { DATA_SOURCE_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/data-source-processing.constants';
import { URL_CRAWL_QUEUE } from 'src/domain/sources/infrastructure/queue/url-crawl.constants';
import { SourceReindexModule } from 'src/domain/sources/infrastructure/queue/source-reindex.module';
import { SourceReindexConsumer } from 'src/domain/sources/infrastructure/queue/source-reindex.consumer';
import { SOURCE_REINDEX_QUEUE } from 'src/domain/sources/infrastructure/queue/source-reindex.constants';
import { SourceReindexScheduler } from 'src/domain/sources/application/services/source-reindex-scheduler.service';
import { SourceReindexer } from 'src/domain/sources/application/services/source-reindexer.service';
import { ModelsModule } from 'src/domain/models/models.module';
import { KnowledgeBaseSyncModule } from 'src/domain/knowledge-base-sync/knowledge-base-sync.module';
import { SyncedFileProcessingConsumer } from 'src/domain/knowledge-base-sync/infrastructure/queue/synced-file-processing.consumer';
import { KNOWLEDGE_BASE_SYNC_QUEUE } from 'src/domain/knowledge-base-sync/infrastructure/queue/knowledge-base-sync.constants';

/** The queues this module's consumers serve; a worker's health check requires them all. */
export const INGESTION_QUEUES = [
  DOCUMENT_PROCESSING_QUEUE,
  DATA_SOURCE_PROCESSING_QUEUE,
  URL_CRAWL_QUEUE,
  SOURCE_REINDEX_QUEUE,
  KNOWLEDGE_BASE_SYNC_QUEUE,
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
    SourceReindexModule,
    RetrieverModule,
    TranscriptionsModule,
    SplitterModule,
    IndexersModule,
    StorageModule,
    ContextModule,
    SpreadsheetParsingModule,
    LocalSourceRepositoryModule,
    // Recordings are summarized once the document consumer has their transcript.
    RecordingSummaryTriggerModule,
    // Completed sources are checked against the org's current embedding model.
    ModelsModule,
    // Synced files are read through connectors and settled by the sync engine.
    KnowledgeBaseSyncModule,
  ],
  providers: [
    StoredSourceFileService,
    ProcessingCheckpointService,
    SourceProcessingHeartbeatService,
    SourceProcessingHelper,
    EarlyEmbeddingService,
    CrawledPdfSourcesService,
    MarkSourceFailedUseCase,
    SourceTranscriptContentService,
    RecordingTranscriptExtractor,
    DocumentProcessingPipeline,
    DocumentProcessingConsumer,
    DataSourceProcessingConsumer,
    UrlCrawlConsumer,
    SourceReindexScheduler,
    SourceReindexer,
    SourceReindexConsumer,
    SyncedFileProcessingConsumer,
  ],
})
export class IngestionConsumersModule {}
