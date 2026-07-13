import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
import { OnboardingUnexpectedError } from '../../onboarding.errors';
import { OnboardingRepository } from '../../ports/onboarding.repository';
import { MarkWelcomeVideoSeenCommand } from './mark-welcome-video-seen.command';

@Injectable()
export class MarkWelcomeVideoSeenUseCase {
  private readonly logger = new Logger(MarkWelcomeVideoSeenUseCase.name);

  constructor(private readonly onboardingRepository: OnboardingRepository) {}

  @HandleUnexpectedErrors(OnboardingUnexpectedError)
  async execute(command: MarkWelcomeVideoSeenCommand): Promise<Onboarding> {
    this.logger.log('markWelcomeVideoSeen', { userId: command.userId });

    return this.onboardingRepository.markWelcomeVideoSeen(
      command.userId,
      new Date(),
    );
  }
}
