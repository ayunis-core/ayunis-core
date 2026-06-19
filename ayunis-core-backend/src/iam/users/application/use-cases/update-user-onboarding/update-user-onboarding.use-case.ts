import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersRepository } from '../../ports/users.repository';
import { UpdateUserOnboardingCommand } from './update-user-onboarding.command';
import { User } from '../../../domain/user.entity';
import { UserNotFoundError, UserUnexpectedError } from '../../users.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserUpdatedEvent } from '../../events/user-updated.event';

@Injectable()
export class UpdateUserOnboardingUseCase {
  private readonly logger = new Logger(UpdateUserOnboardingUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateUserOnboardingCommand): Promise<User> {
    this.logger.log('updateUserOnboarding', {
      userId: command.userId,
      completedStepIdsCount: command.completedStepIds.length,
      hidden: command.hidden,
    });

    try {
      const user = await this.usersRepository.findOneById(command.userId);
      if (!user) {
        throw new UserNotFoundError(command.userId);
      }

      user.onboardingCompletedStepIds = command.completedStepIds;
      user.onboardingHidden = command.hidden;
      const updatedUser = await this.usersRepository.update(user);
      this.logger.log('user onboarding updated successfully', {
        userId: updatedUser.id,
      });

      this.eventEmitter
        .emitAsync(
          UserUpdatedEvent.EVENT_NAME,
          new UserUpdatedEvent(updatedUser.id, updatedUser.orgId, updatedUser),
        )
        .catch((err: unknown) => {
          this.logger.error('Failed to emit UserUpdatedEvent', {
            error: err instanceof Error ? err.message : 'Unknown error',
            userId: updatedUser.id,
          });
        });

      return updatedUser;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to update user onboarding', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: command.userId,
      });
      throw new UserUnexpectedError(error as Error);
    }
  }
}
