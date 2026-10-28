import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AnonymizationModule } from 'src/common/anonymization/anonymization.module';
import { AnonymizationSettingsModule } from 'src/domain/anonymization-settings/anonymization-settings.module';
import { ThreadPiiMaskRecord } from './infrastructure/persistence/postgres/schema/thread-pii-mask.record';
import { ThreadPiiMaskRepository } from './application/ports/thread-pii-mask.repository';
import { PostgresThreadPiiMaskRepository } from './infrastructure/persistence/postgres/thread-pii-mask.repository';

import { GetThreadPiiMasksUseCase } from './application/use-cases/get-thread-pii-masks/get-thread-pii-masks.use-case';
import { AnonymizeTextForThreadUseCase } from './application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import { UnmaskThreadPiiMaskUseCase } from './application/use-cases/unmask-thread-pii-mask/unmask-thread-pii-mask.use-case';
import { PiiMaskDtoMapper } from './presenters/http/mappers/pii-mask.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThreadPiiMaskRecord]),
    AnonymizationModule,
    AnonymizationSettingsModule,
  ],
  providers: [
    {
      provide: ThreadPiiMaskRepository,
      useClass: PostgresThreadPiiMaskRepository,
    },
    GetThreadPiiMasksUseCase,
    AnonymizeTextForThreadUseCase,
    UnmaskThreadPiiMaskUseCase,
    PiiMaskDtoMapper,
  ],
  exports: [
    GetThreadPiiMasksUseCase,
    AnonymizeTextForThreadUseCase,
    UnmaskThreadPiiMaskUseCase,
    PiiMaskDtoMapper,
  ],
})
export class ThreadPiiMasksModule {}
