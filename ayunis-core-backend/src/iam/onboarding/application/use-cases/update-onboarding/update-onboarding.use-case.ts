import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OnboardingRepository } from '../../ports/onboarding.repository';
import { UpdateOnboardingCommand } from './update-onboarding.command';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
import { OnboardingUnexpectedError } from '../../onboarding.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class UpdateOnboardingUseCase {
  constructor(
    @InjectPinoLogger(UpdateOnboardingUseCase.name)
    private readonly logger: PinoLogger,
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  @HandleUnexpectedErrors(OnboardingUnexpectedError)
  async execute(command: UpdateOnboardingCommand): Promise<Onboarding> {
    this.logger.info(
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
