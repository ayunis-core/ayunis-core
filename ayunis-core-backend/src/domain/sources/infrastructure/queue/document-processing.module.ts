import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { DocumentProcessingPort } from 'src/domain/sources/application/ports/document-processing.port';
import { DOCUMENT_PROCESSING_QUEUE } from './document-processing.constants';
import { DocumentProcessingProducer } from './document-processing.producer';

// Enqueue side only. The consumer lives in IngestionConsumersModule, so a
// process can add jobs without working through the queue.
@Module({
  imports: [
    OrgsModule,
    BullModule.registerQueue({ name: DOCUMENT_PROCESSING_QUEUE }),
  ],
  providers: [
    DocumentProcessingProducer,
    {
      provide: DocumentProcessingPort,
      useExisting: DocumentProcessingProducer,
    },
  ],
  exports: [DocumentProcessingPort, BullModule],
})
export class DocumentProcessingModule {}
