import { GetSourceProcessingProgressUseCase } from 'src/domain/sources/application/use-cases/get-source-processing-progress/get-source-processing-progress.use-case';
import { SourceProcessingProgressPort } from 'src/domain/sources/application/ports/source-processing-progress.port';
import { SourceProcessingProgressAdapter } from 'src/domain/sources/infrastructure/queue/source-processing-progress.adapter';
import { BullModule } from '@nestjs/bullmq';
import { OrgProcessingDeletionListener } from 'src/domain/sources/infrastructure/queue/org-deletion-requested.listener';
import { DOCUMENT_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/document-processing.constants';
import { DATA_SOURCE_PROCESSING_QUEUE } from 'src/domain/sources/infrastructure/queue/data-source-processing.constants';
import { URL_CRAWL_QUEUE } from 'src/domain/sources/infrastructure/queue/url-crawl.constants';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import sourceUploadConfig from 'src/config/source-upload.config';
import transcriptionConfig from 'src/config/transcription.config';
import { LocalSourceRepositoryModule } from './infrastructure/persistence/local/local-source-repository.module';
import { ModelsModule } from 'src/domain/models/models.module';
import { SplitterModule } from 'src/domain/rag/splitters/splitter.module';
import { RetrieverModule } from 'src/domain/retrievers/retriever.module';
import { IndexersModule } from 'src/domain/rag/indexers/indexers.module';
import { StorageModule } from 'src/domain/storage/storage.module';
import { SourceUploadStorageCleanupService } from './application/services/source-upload-storage-cleanup.service';
import { SweepOrphanedSourcesUseCase } from './application/use-cases/sweep-orphaned-sources/sweep-orphaned-sources.use-case';
import { OrphanedSourcesSweepTask } from './infrastructure/tasks/orphaned-sources-sweep.task';
import { SweepUnreferencedOriginalsUseCase } from './application/use-cases/sweep-unreferenced-originals/sweep-unreferenced-originals.use-case';
import { UnreferencedOriginalsSweepTask } from './infrastructure/tasks/unreferenced-originals-sweep.task';
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
import { DeleteUnreferencedSourcesUseCase } from './application/use-cases/delete-unreferenced-sources/delete-unreferenced-sources.use-case';
import { CreateProcessingUrlSourceUseCase } from './application/use-cases/create-processing-url-source/create-processing-url-source.use-case';
import { EnqueueUrlCrawlUseCase } from './application/use-cases/enqueue-url-crawl/enqueue-url-crawl.use-case';
import { FindSourceCitationTargetUseCase } from './application/use-cases/find-source-citation-target/find-source-citation-target.use-case';
import { CreateSourceUploadSessionUseCase } from './application/use-cases/create-source-upload-session/create-source-upload-session.use-case';
import { SignSourceUploadRequestUseCase } from './application/use-cases/sign-source-upload-request/sign-source-upload-request.use-case';
import { AbortSourceUploadUseCase } from './application/use-cases/abort-source-upload/abort-source-upload.use-case';
import { CompleteSourceUploadUseCase } from './application/use-cases/complete-source-upload/complete-source-upload.use-case';
import { SweepSourceUploadSessionsUseCase } from './application/use-cases/sweep-source-upload-sessions/sweep-source-upload-sessions.use-case';
import { SourceUploadSessionAccessService } from './application/services/source-upload-session-access.service';
import { SourceUploadQueueingService } from './application/services/source-upload-queueing.service';
import { SourceUploadSweepTask } from './infrastructure/tasks/source-upload-sweep.task';
import { StaleProcessingCleanupTask } from './infrastructure/tasks/stale-processing-cleanup.task';
import { SourceUploadsController } from './presenters/http/source-uploads.controller';
import { OrgsModule } from 'src/iam/orgs/orgs.module';

const SOURCE_UPLOAD_USE_CASES = [
  CreateSourceUploadSessionUseCase,
  SignSourceUploadRequestUseCase,
  AbortSourceUploadUseCase,
  CompleteSourceUploadUseCase,
  SweepSourceUploadSessionsUseCase,
];

@Module({
  imports: [
    // The upload-session cap for recordings comes from the transcription config.
    ConfigModule.forFeature(transcriptionConfig),
    ConfigModule.forFeature(sourceUploadConfig),
    BullModule.registerQueue(
      ...[
        DOCUMENT_PROCESSING_QUEUE,
        DATA_SOURCE_PROCESSING_QUEUE,
        URL_CRAWL_QUEUE,
      ].map((name) => ({ name })),
    ),
    LocalSourceRepositoryModule,
    RetrieverModule,
    SplitterModule,
    IndexersModule,
    StorageModule,
    DocumentProcessingModule,
    DataSourceProcessingModule,
    UrlCrawlModule,
    SpreadsheetParsingModule,
    OrgsModule,
    forwardRef(() => ModelsModule), // Models → Sources → Models (circular)
  ],
  controllers: [SourceUploadsController],
  providers: [
    GetSourceProcessingProgressUseCase,
    {
      provide: SourceProcessingProgressPort,
      useClass: SourceProcessingProgressAdapter,
    },
    SourceUploadStorageCleanupService,
    SweepOrphanedSourcesUseCase,
    OrphanedSourcesSweepTask,
    SweepUnreferencedOriginalsUseCase,
    UnreferencedOriginalsSweepTask,
    OrgProcessingDeletionListener,
    SourceUploadSessionAccessService,
    SourceUploadQueueingService,
    SourceUploadSweepTask,
    StaleProcessingCleanupTask,
    ...SOURCE_UPLOAD_USE_CASES,
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
    FindSourceCitationTargetUseCase,
    ExtractTextLinesUseCase,
    GetSourcesByKnowledgeBaseIdUseCase,
    CreateProcessingSourceUseCase,
    MarkSourceFailedUseCase,
    EnqueueDocumentProcessingUseCase,
    StartDocumentProcessingUseCase,
    StartDataSourceProcessingUseCase,
    EnqueueDataSourceProcessingUseCase,
    FindUnreferencedSourceIdsUseCase,
    DeleteUnreferencedSourcesUseCase,
    CreateProcessingUrlSourceUseCase,
    EnqueueUrlCrawlUseCase,
  ],
  exports: [
    GetSourceProcessingProgressUseCase,
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
    FindSourceCitationTargetUseCase,
    ExtractTextLinesUseCase,
    GetSourcesByKnowledgeBaseIdUseCase,
    CreateProcessingSourceUseCase,
    MarkSourceFailedUseCase,
    EnqueueDocumentProcessingUseCase,
    StartDocumentProcessingUseCase,
    StartDataSourceProcessingUseCase,
    EnqueueDataSourceProcessingUseCase,
    FindUnreferencedSourceIdsUseCase,
    DeleteUnreferencedSourcesUseCase,
    CreateProcessingUrlSourceUseCase,
    EnqueueUrlCrawlUseCase,
    CreateSourceUploadSessionUseCase,
    CompleteSourceUploadUseCase,
  ],
})
export class SourcesModule {}
