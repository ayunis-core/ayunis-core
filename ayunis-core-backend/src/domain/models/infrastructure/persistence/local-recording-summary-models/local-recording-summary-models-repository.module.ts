import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordingSummaryModelsRepository } from 'src/domain/models/application/ports/recording-summary-models.repository';
import { LocalPermittedModelsRepositoryModule } from 'src/domain/models/infrastructure/persistence/local-permitted-models/local-permitted-models-repository.module';
import { RecordingSummaryModelRecord } from './schema/recording-summary-model.record';
import { LocalRecordingSummaryModelsRepository } from './local-recording-summary-models.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecordingSummaryModelRecord]),
    LocalPermittedModelsRepositoryModule,
  ],
  providers: [
    {
      provide: RecordingSummaryModelsRepository,
      useClass: LocalRecordingSummaryModelsRepository,
    },
  ],
  exports: [RecordingSummaryModelsRepository],
})
export class LocalRecordingSummaryModelsRepositoryModule {}
