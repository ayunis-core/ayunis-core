import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateTrialUseCase } from './application/use-cases/create-trial/create-trial.use-case';
import { GetTrialUseCase } from './application/use-cases/get-trial/get-trial.use-case';
import { IncrementTrialMessagesUseCase } from './application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { UpdateTrialUseCase } from './application/use-cases/update-trial/update-trial.use-case';
import { TrialRepository } from './application/ports/trial.repository';
import { LocalTrialsRepository } from './infrastructure/persistence/local/local-trials.repository';
import { TrialRecord } from './infrastructure/persistence/local/schema/trial.record';
import { SuperAdminTrialsController } from './presenters/http/super-admin-trials.controller';
import { SuperAdminTrialResponseDtoMapper } from './presenters/http/mappers/super-admin-trial-response-dto.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([TrialRecord])],
  controllers: [SuperAdminTrialsController],
  providers: [
    {
      provide: TrialRepository,
      useClass: LocalTrialsRepository,
    },
    CreateTrialUseCase,
    GetTrialUseCase,
    IncrementTrialMessagesUseCase,
    UpdateTrialUseCase,
    SuperAdminTrialResponseDtoMapper,
  ],
  exports: [
    TrialRepository,
    CreateTrialUseCase,
    GetTrialUseCase,
    IncrementTrialMessagesUseCase,
    UpdateTrialUseCase,
  ],
})
export class TrialsModule {}
