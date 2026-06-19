import { Injectable } from '@nestjs/common';
import { Onboarding } from '../../../domain/onboarding.entity';
import { OnboardingResponseDto } from '../dtos/onboarding-response.dto';

@Injectable()
export class OnboardingResponseDtoMapper {
  toDto(onboarding: Onboarding): OnboardingResponseDto {
    return {
      completedStepIds: onboarding.completedStepIds,
      hidden: onboarding.hidden,
    };
  }
}
