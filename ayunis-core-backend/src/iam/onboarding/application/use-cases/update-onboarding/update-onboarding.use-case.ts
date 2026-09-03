import { Injectable, Logger } from '@nestjs/common';
import { OnboardingRepository } from 'src/iam/onboarding/application/ports/onboarding.repository';
import { UpdateOnboardingCommand } from './update-onboarding.command';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
import { OnboardingUnexpectedError } from 'src/iam/onboarding/application/onboarding.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class UpdateOnboardingUseCase {
  private readonly logger = new Logger(UpdateOnboardingUseCase.name);

  constructor(private readonly onboardingRepository: OnboardingRepository) {}

  @HandleUnexpectedErrors(OnboardingUnexpectedError)
  async execute(command: UpdateOnboardingCommand): Promise<Onboarding> {
    this.logger.log(
      {
        userId: command.userId,
        completedStepIdsCount: command.completedStepIds.length,
        hidden: command.hidden,
      },
      'updateOnboarding',
    );

    const onboarding = new Onboarding({
      userId: command.userId,
      completedStepIds: command.completedStepIds,
      hidden: command.hidden,
    });

    return await this.onboardingRepository.saveProgress(onboarding);
  }
}
