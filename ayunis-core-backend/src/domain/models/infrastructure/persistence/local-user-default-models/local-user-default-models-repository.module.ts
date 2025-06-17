import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDefaultModelRecord } from './schema/user-default-model.record';
import { UserDefaultModelMapper } from './mappers/user-default-model.mapper';
import { LocalUserDefaultModelsRepository } from './local-user-default-models.repository';
import { UserDefaultModelsRepository } from '../../../application/ports/user-default-models.repository';
import { LocalPermittedModelsRepositoryModule } from '../local-permitted-models/local-permitted-models-repository.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDefaultModelRecord]),
    LocalPermittedModelsRepositoryModule,
  ],
  providers: [
    LocalUserDefaultModelsRepository,
    UserDefaultModelMapper,
    {
      provide: UserDefaultModelsRepository,
      useClass: LocalUserDefaultModelsRepository,
    },
  ],
  exports: [
    LocalUserDefaultModelsRepository,
    UserDefaultModelMapper,
    UserDefaultModelsRepository,
  ],
})
export class LocalUserDefaultModelsRepositoryModule {}
