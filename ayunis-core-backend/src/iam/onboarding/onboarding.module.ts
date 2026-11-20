import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingRepository } from './application/ports/onboarding.repository';
import { LocalOnboardingRepository } from './infrastructure/persistence/local/local-onboarding.repository';
import { OnboardingMapper } from './infrastructure/persistence/local/mappers/onboarding.mapper';
import { OnboardingRecord } from './infrastructure/persistence/local/schema/onboarding.record';
import { GetOnboardingUseCase } from './application/use-cases/get-onboarding/get-onboarding.use-case';
import { UpdateOnboardingUseCase } from './application/use-cases/update-onboarding/update-onboarding.use-case';
import { OnboardingController } from './presenters/http/onboarding.controller';
import { OnboardingResponseDtoMapper } from './presenters/http/mappers/onboarding-response-dto.mapper';
import { MarkWelcomeVideoSeenUseCase } from './application/use-cases/mark-welcome-video-seen/mark-welcome-video-seen.use-case';
import { GetOnboardingStageUseCase } from './application/use-cases/get-onboarding-stage/get-onboarding-stage.use-case';
import { MemoryModule } from 'src/domain/memory/memory.module';
import { ModelsModule } from 'src/domain/models/models.module';
import { SkillsModule } from 'src/domain/skills/skills.module';
import { PermissionsModule } from 'src/iam/permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OnboardingRecord]),
    MemoryModule,
    ModelsModule,
    SkillsModule,
    PermissionsModule,
  ],
  controllers: [OnboardingController],
  providers: [
    {
      provide: OnboardingRepository,
      useClass: LocalOnboardingRepository,
    },
    OnboardingMapper,
    GetOnboardingUseCase,
    UpdateOnboardingUseCase,
    MarkWelcomeVideoSeenUseCase,
    GetOnboardingStageUseCase,
    OnboardingResponseDtoMapper,
  ],
  exports: [
    GetOnboardingUseCase,
    UpdateOnboardingUseCase,
    MarkWelcomeVideoSeenUseCase,
  ],
})
export class OnboardingModule {}
