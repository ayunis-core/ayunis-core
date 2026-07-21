import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { StorageModule } from 'src/domain/storage/storage.module';
import { ContextModule } from 'src/common/context/context.module';
import { LocalSourceRepositoryModule } from '../persistence/local/local-source-repository.module';
import { SpreadsheetParsingModule } from '../parsing/spreadsheet-parsing.module';
import { MarkSourceFailedUseCase } from '../../application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { DataSourceProcessingPort } from '../../application/ports/data-source-processing.port';
import { DATA_SOURCE_PROCESSING_QUEUE } from './data-source-processing.constants';
import { DataSourceProcessingProducer } from './data-source-processing.producer';
import { DataSourceProcessingConsumer } from './data-source-processing.consumer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: DATA_SOURCE_PROCESSING_QUEUE,
    }),
    StorageModule,
    ContextModule,
    LocalSourceRepositoryModule,
    SpreadsheetParsingModule,
  ],
  providers: [
    DataSourceProcessingProducer,
    {
      provide: DataSourceProcessingPort,
      useExisting: DataSourceProcessingProducer,
    },
    DataSourceProcessingConsumer,
    MarkSourceFailedUseCase,
  ],
  exports: [DataSourceProcessingPort],
})
export class DataSourceProcessingModule {}
