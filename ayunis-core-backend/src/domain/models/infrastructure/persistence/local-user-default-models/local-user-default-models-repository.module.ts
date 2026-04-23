import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDefaultModelRecord } from './schema/user-default-model.record';
import { UserDefaultModelMapper } from './mappers/user-default-model.mapper';
import { LocalUserDefaultModelsRepository } from './local-user-default-models.repository';
import { UserDefaultModelsRepository } from '../../../application/ports/user-default-models.repository';
import { LocalModelsRepositoryModule } from '../local-models/local-models-repository.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDefaultModelRecord]),
    LocalModelsRepositoryModule,
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
