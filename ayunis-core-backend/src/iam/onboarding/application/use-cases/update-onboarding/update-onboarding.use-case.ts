import { Injectable, Logger } from '@nestjs/common';
import { OnboardingRepository } from 'src/iam/onboarding/application/ports/onboarding.repository';
import { UpdateOnboardingCommand } from './update-onboarding.command';
import { Onboarding } from 'src/iam/onboarding/domain/onboarding.entity';
import { OnboardingUnexpectedError } from 'src/iam/onboarding/application/onboarding.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnboardingUpdatedEvent } from 'src/iam/onboarding/application/events/onboarding-updated.event';

@Injectable()
export class UpdateOnboardingUseCase {
  private readonly logger = new Logger(UpdateOnboardingUseCase.name);

  constructor(
    private readonly onboardingRepository: OnboardingRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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

    const previous = await this.onboardingRepository.findByUserId(
      command.userId,
    );
    const onboarding = new Onboarding({
      userId: command.userId,
      completedStepIds: command.completedStepIds,
      hidden: command.hidden,
    });
    const saved = await this.onboardingRepository.saveProgress(onboarding);

    this.eventEmitter
      .emitAsync(
        OnboardingUpdatedEvent.EVENT_NAME,
        new OnboardingUpdatedEvent(
          command.userId,
          previous?.completedStepIds ?? [],
          saved.completedStepIds,
          previous?.hidden ?? false,
          saved.hidden,
        ),
      )
      .catch((error: unknown) => {
        this.logger.error(
          {
            userId: command.userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to emit OnboardingUpdatedEvent',
        );
      });

    return saved;
  }
}
