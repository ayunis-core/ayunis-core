import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { DataSourceProcessingPort } from 'src/domain/sources/application/ports/data-source-processing.port';
import { DATA_SOURCE_PROCESSING_QUEUE } from './data-source-processing.constants';
import { DataSourceProcessingProducer } from './data-source-processing.producer';

// Enqueue side only. The consumer lives in IngestionConsumersModule, so a
// process can add jobs without working through the queue.
@Module({
  imports: [
    OrgsModule,
    BullModule.registerQueue({ name: DATA_SOURCE_PROCESSING_QUEUE }),
  ],
  providers: [
    DataSourceProcessingProducer,
    {
      provide: DataSourceProcessingPort,
      useExisting: DataSourceProcessingProducer,
    },
  ],
  exports: [DataSourceProcessingPort, BullModule],
})
export class DataSourceProcessingModule {}
