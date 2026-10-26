import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { LocalPermittedModelsRepositoryModule } from 'src/domain/models/infrastructure/persistence/local-permitted-models/local-permitted-models-repository.module';
import { DefaultModelSelectionRecord } from './schema/default-model-selection.record';
import { LocalDefaultModelSelectionsRepository } from './local-default-model-selections.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([DefaultModelSelectionRecord]),
    LocalPermittedModelsRepositoryModule,
  ],
  providers: [
    {
      provide: DefaultModelSelectionsRepository,
      useClass: LocalDefaultModelSelectionsRepository,
    },
  ],
  exports: [DefaultModelSelectionsRepository],
})
export class LocalDefaultModelSelectionsRepositoryModule {}
