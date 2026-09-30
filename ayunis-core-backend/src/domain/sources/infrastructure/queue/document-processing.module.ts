import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RetrieverModule } from 'src/domain/retrievers/retriever.module';
import { SplitterModule } from 'src/domain/rag/splitters/splitter.module';
import { IndexersModule } from 'src/domain/rag/indexers/indexers.module';
import { StorageModule } from 'src/domain/storage/storage.module';
import { ContextModule } from 'src/common/context/context.module';
import { LocalSourceRepositoryModule } from 'src/domain/sources/infrastructure/persistence/local/local-source-repository.module';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { SourceProcessingHelper } from 'src/domain/sources/application/services/source-processing-helper.service';
import { SourceContentReplacementService } from 'src/domain/sources/application/services/source-content-replacement.service';
import { SourceIngestionService } from 'src/domain/sources/application/services/source-ingestion.service';
import { SourceContentDegradationGuard } from 'src/domain/sources/application/services/source-content-degradation-guard.service';
import { FileSourceExtractor } from 'src/domain/sources/application/services/file-source-extractor.service';
import { DocumentProcessingPort } from 'src/domain/sources/application/ports/document-processing.port';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { DocumentProcessingProducer } from './document-processing.producer';
import { DocumentProcessingConsumer } from './document-processing.consumer';
import { StaleProcessingCleanupTask } from 'src/domain/sources/infrastructure/tasks/stale-processing-cleanup.task';

@Module({
  imports: [
    BullModule.registerQueue({
      name: DOCUMENT_PROCESSING_QUEUE,
    }),
    RetrieverModule,
    SplitterModule,
    IndexersModule,
    StorageModule,
    ContextModule,
    LocalSourceRepositoryModule,
  ],
  providers: [
    DocumentProcessingProducer,
    {
      provide: DocumentProcessingPort,
      useExisting: DocumentProcessingProducer,
    },
    DocumentProcessingConsumer,
    StaleProcessingCleanupTask,
    MarkSourceFailedUseCase,
    SourceProcessingHelper,
    SourceContentReplacementService,
    SourceIngestionService,
    SourceContentDegradationGuard,
    FileSourceExtractor,
  ],
  exports: [DocumentProcessingPort],
})
export class DocumentProcessingModule {}
