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

@Module({
  imports: [TypeOrmModule.forFeature([OnboardingRecord])],
  controllers: [OnboardingController],
  providers: [
    {
      provide: OnboardingRepository,
      useClass: LocalOnboardingRepository,
    },
    OnboardingMapper,
    GetOnboardingUseCase,
    UpdateOnboardingUseCase,
    OnboardingResponseDtoMapper,
  ],
  exports: [GetOnboardingUseCase, UpdateOnboardingUseCase],
})
export class OnboardingModule {}
