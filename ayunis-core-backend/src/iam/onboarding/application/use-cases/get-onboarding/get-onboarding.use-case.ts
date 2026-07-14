import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { OnboardingRepository } from '../../ports/onboarding.repository';
import { GetOnboardingQuery } from './get-onboarding.query';
import { Onboarding } from '../../../domain/onboarding.entity';
import { OnboardingUnexpectedError } from '../../onboarding.errors';

@Injectable()
export class GetOnboardingUseCase {
  private readonly logger = new Logger(GetOnboardingUseCase.name);

  constructor(private readonly onboardingRepository: OnboardingRepository) {}

  @HandleUnexpectedErrors(OnboardingUnexpectedError)
  async execute(query: GetOnboardingQuery): Promise<Onboarding> {
    this.logger.log('getOnboarding', { userId: query.userId });

    const onboarding = await this.onboardingRepository.findByUserId(
      query.userId,
    );
    // No row yet means the user hasn't touched onboarding — return a
    // transient default so the read endpoint never 404s.
    return onboarding ?? new Onboarding({ userId: query.userId });
  }
}
