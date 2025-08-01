import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ModelRecord,
  LanguageModelRecord,
  EmbeddingModelRecord,
} from './schema/model.record';
import { LocalModelsRepository } from './local-models.repository';
import { ModelsRepository } from '../../../application/ports/models.repository';
import { ModelMapper } from './mappers/model.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ModelRecord,
      LanguageModelRecord,
      EmbeddingModelRecord,
    ]),
  ],
  providers: [
    LocalModelsRepository,
    ModelMapper,
    {
      provide: ModelsRepository,
      useClass: LocalModelsRepository,
    },
  ],
  exports: [LocalModelsRepository, ModelMapper, ModelsRepository],
})
export class LocalModelsRepositoryModule {}
