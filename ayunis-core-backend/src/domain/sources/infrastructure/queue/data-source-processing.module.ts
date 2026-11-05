import { ingestionConsumers } from 'src/config/ingestion.config';
import { OrgsModule } from 'src/iam/orgs/orgs.module';
import { Module } from '@nestjs/common';
import { StoredSourceFileService } from 'src/domain/sources/application/services/stored-source-file.service';
import { BullModule } from '@nestjs/bullmq';
import { StorageModule } from 'src/domain/storage/storage.module';
import { ContextModule } from 'src/common/context/context.module';
import { LocalSourceRepositoryModule } from 'src/domain/sources/infrastructure/persistence/local/local-source-repository.module';
import { SpreadsheetParsingModule } from 'src/domain/sources/infrastructure/parsing/spreadsheet-parsing.module';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { DataSourceProcessingPort } from 'src/domain/sources/application/ports/data-source-processing.port';
import { DATA_SOURCE_PROCESSING_QUEUE } from './data-source-processing.constants';
import { DataSourceProcessingProducer } from './data-source-processing.producer';
import { DataSourceProcessingConsumer } from './data-source-processing.consumer';

@Module({
  imports: [
    OrgsModule,
    BullModule.registerQueue({
      name: DATA_SOURCE_PROCESSING_QUEUE,
    }),
    StorageModule,
    ContextModule,
    LocalSourceRepositoryModule,
    SpreadsheetParsingModule,
  ],
  providers: [
    StoredSourceFileService,
    DataSourceProcessingProducer,
    {
      provide: DataSourceProcessingPort,
      useExisting: DataSourceProcessingProducer,
    },
    ...ingestionConsumers([DataSourceProcessingConsumer]),
    MarkSourceFailedUseCase,
  ],
  exports: [DataSourceProcessingPort],
})
export class DataSourceProcessingModule {}
