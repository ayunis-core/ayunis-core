import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelModeEntriesRepository } from 'src/domain/models/application/ports/model-mode-entries.repository';
import { LocalModelsRepositoryModule } from 'src/domain/models/infrastructure/persistence/local-models/local-models-repository.module';
import { ModelModeEntryRecord } from './schema/model-mode-entry.record';
import { ModelModeEntryMapper } from './mappers/model-mode-entry.mapper';
import { LocalModelModeEntriesRepository } from './local-model-mode-entries.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ModelModeEntryRecord]),
    LocalModelsRepositoryModule,
  ],
  providers: [
    ModelModeEntryMapper,
    {
      provide: ModelModeEntriesRepository,
      useClass: LocalModelModeEntriesRepository,
    },
  ],
  exports: [ModelModeEntriesRepository],
})
export class LocalModelModeEntriesRepositoryModule {}
