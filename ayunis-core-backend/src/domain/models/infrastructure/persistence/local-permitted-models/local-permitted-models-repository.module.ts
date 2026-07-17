import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermittedModelRecord } from './schema/permitted-model.record';
import { PermittedModelMapper } from './mappers/permitted-model.mapper';
import { LocalPermittedModelsRepository } from './local-permitted-models.repository';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { LocalModelsRepositoryModule } from '../local-models/local-models-repository.module';
import { PermittedModelFinder } from './permitted-model-finder';

@Module({
  imports: [
    TypeOrmModule.forFeature([PermittedModelRecord]),
    LocalModelsRepositoryModule,
  ],
  providers: [
    PermittedModelFinder,
    LocalPermittedModelsRepository,
    PermittedModelMapper,
    {
      provide: PermittedModelsRepository,
      useClass: LocalPermittedModelsRepository,
    },
  ],
  exports: [
    LocalPermittedModelsRepository,
    PermittedModelMapper,
    PermittedModelsRepository,
  ],
})
export class LocalPermittedModelsRepositoryModule {}
