import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { OnboardingRepository } from '../../ports/onboarding.repository';
import { UpdateOnboardingCommand } from './update-onboarding.command';
import { Onboarding } from '../../../domain/onboarding.entity';
import { OnboardingUnexpectedError } from '../../onboarding.errors';

@Injectable()
export class UpdateOnboardingUseCase {
  private readonly logger = new Logger(UpdateOnboardingUseCase.name);

  constructor(private readonly onboardingRepository: OnboardingRepository) {}

  @HandleUnexpectedErrors(OnboardingUnexpectedError)
  async execute(command: UpdateOnboardingCommand): Promise<Onboarding> {
    this.logger.log('updateOnboarding', {
      userId: command.userId,
      completedStepIdsCount: command.completedStepIds.length,
      hidden: command.hidden,
    });

    const onboarding = await this.findOrCreateForUser(command.userId);

    onboarding.completedStepIds = command.completedStepIds;
    onboarding.hidden = command.hidden;

    return await this.onboardingRepository.save(onboarding);
  }

  private async findOrCreateForUser(userId: UUID): Promise<Onboarding> {
    const existing = await this.onboardingRepository.findByUserId(userId);

    return existing ?? new Onboarding({ userId });
  }
}
