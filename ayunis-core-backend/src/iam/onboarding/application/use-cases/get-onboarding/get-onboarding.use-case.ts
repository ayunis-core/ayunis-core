import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OnboardingRepository } from '../../ports/onboarding.repository';
import { GetOnboardingQuery } from './get-onboarding.query';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
import { OnboardingUnexpectedError } from '../../onboarding.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetOnboardingUseCase {
  constructor(
    @InjectPinoLogger(GetOnboardingUseCase.name)
    private readonly logger: PinoLogger,
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  async execute(query: GetOnboardingQuery): Promise<Onboarding> {
    this.logger.info({ userId: query.userId }, 'getOnboarding');

    try {
      const onboarding = await this.onboardingRepository.findByUserId(
        query.userId,
      );
      // No row yet means the user hasn't touched onboarding — return a
      // transient default so the read endpoint never 404s.
      return onboarding ?? new Onboarding({ userId: query.userId });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          userId: query.userId,
        },
        'Failed to get onboarding',
      );
      throw new OnboardingUnexpectedError(error as Error);
    }
  }
}
