import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalModelRecord } from './schema/local-model.record';
import { LocalModelsRepository } from './local-models.repository';
import { ModelsRepository } from '../../../application/ports/models.repository';
import { LocalModelMapper } from './mappers/local-model.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([LocalModelRecord])],
  providers: [
    LocalModelsRepository,
    LocalModelMapper,
    {
      provide: ModelsRepository,
      useClass: LocalModelsRepository,
    },
  ],
  exports: [LocalModelsRepository, LocalModelMapper, ModelsRepository],
})
export class LocalModelsRepositoryModule {}
