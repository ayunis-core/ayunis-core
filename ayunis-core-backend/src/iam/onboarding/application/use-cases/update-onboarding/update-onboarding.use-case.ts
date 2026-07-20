import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { OnboardingRepository } from '../../ports/onboarding.repository';
import { UpdateOnboardingCommand } from './update-onboarding.command';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
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
      const onboarding = await this.findOrCreateForUser(command.userId);

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

  private async findOrCreateForUser(userId: UUID): Promise<Onboarding> {
    const existing = await this.onboardingRepository.findByUserId(userId);

    return existing ?? new Onboarding({ userId });
  }
}
