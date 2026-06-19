import { Injectable, Logger } from '@nestjs/common';
import { OnboardingRepository } from '../../ports/onboarding.repository';
import { UpdateOnboardingCommand } from './update-onboarding.command';
import { Onboarding } from '../../../domain/onboarding.entity';
import { OnboardingUnexpectedError } from '../../onboarding.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UpdateOnboardingUseCase {
  private readonly logger = new Logger(UpdateOnboardingUseCase.name);

  constructor(private readonly onboardingRepository: OnboardingRepository) {}

  async execute(command: UpdateOnboardingCommand): Promise<Onboarding> {
    this.logger.log('updateOnboarding', {
      userId: command.userId,
      completedStepIdsCount: command.completedStepIds.length,
      hidden: command.hidden,
    });

    try {
      const onboarding =
        (await this.onboardingRepository.findByUserId(command.userId)) ??
        new Onboarding({ userId: command.userId });

      onboarding.completedStepIds = command.completedStepIds;
      onboarding.hidden = command.hidden;

      return await this.onboardingRepository.save(onboarding);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to update onboarding', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: command.userId,
      });
      throw new OnboardingUnexpectedError(error as Error);
    }
  }
}
