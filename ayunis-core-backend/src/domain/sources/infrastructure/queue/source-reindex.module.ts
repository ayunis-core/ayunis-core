import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { SourceReindexProcessingPort } from 'src/domain/sources/application/ports/source-reindex-processing.port';
import { SOURCE_REINDEX_QUEUE } from './source-reindex.constants';
import { SourceReindexProducer } from './source-reindex.producer';

// Enqueue side only. The consumer lives in IngestionConsumersModule, so a
// process can add jobs without working through the queue.
@Module({
  imports: [
    OrgsModule,
    BullModule.registerQueue({ name: SOURCE_REINDEX_QUEUE }),
  ],
  providers: [
    SourceReindexProducer,
    {
      provide: SourceReindexProcessingPort,
      useExisting: SourceReindexProducer,
    },
  ],
  exports: [SourceReindexProcessingPort, BullModule],
})
export class SourceReindexModule {}
