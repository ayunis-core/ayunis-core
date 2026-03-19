import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RetrieverModule } from 'src/domain/retrievers/retriever.module';
import { SplitterModule } from 'src/domain/rag/splitters/splitter.module';
import { IndexersModule } from 'src/domain/rag/indexers/indexers.module';
import { StorageModule } from 'src/domain/storage/storage.module';
import { ContextModule } from 'src/common/context/context.module';
import { LocalSourceRepositoryModule } from '../persistence/local/local-source-repository.module';
import { MarkSourceFailedUseCase } from '../../application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { DocumentProcessingPort } from '../../application/ports/document-processing.port';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { DocumentProcessingProducer } from './document-processing.producer';
import { DocumentProcessingConsumer } from './document-processing.consumer';
import { StaleProcessingCleanupService } from './stale-processing-cleanup.service';

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
    StaleProcessingCleanupService,
    MarkSourceFailedUseCase,
  ],
  exports: [DocumentProcessingPort],
})
export class DocumentProcessingModule {}
