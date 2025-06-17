import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermittedModelRecord } from './schema/permitted-model.record';
import { PermittedModelMapper } from './mappers/permitted-model.mapper';
import { LocalPermittedModelsRepository } from './local-permitted-models.repository';
import { PermittedModelsRepository } from '../../../application/ports/permitted-models.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PermittedModelRecord])],
  providers: [
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
