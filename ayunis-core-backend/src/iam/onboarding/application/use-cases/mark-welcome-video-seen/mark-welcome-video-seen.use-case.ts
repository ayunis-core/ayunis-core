import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
import { OnboardingUnexpectedError } from '../../onboarding.errors';
import { OnboardingRepository } from '../../ports/onboarding.repository';
import { MarkWelcomeVideoSeenCommand } from './mark-welcome-video-seen.command';

@Injectable()
export class MarkWelcomeVideoSeenUseCase {
  constructor(
    @InjectPinoLogger(MarkWelcomeVideoSeenUseCase.name)
    private readonly logger: PinoLogger,
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  @HandleUnexpectedErrors(OnboardingUnexpectedError)
  async execute(command: MarkWelcomeVideoSeenCommand): Promise<Onboarding> {
    this.logger.info({ userId: command.userId }, 'markWelcomeVideoSeen');

    return this.onboardingRepository.markWelcomeVideoSeen(
      command.userId,
      new Date(),
    );
  }
}
