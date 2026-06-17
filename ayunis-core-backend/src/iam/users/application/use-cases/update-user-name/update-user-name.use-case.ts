import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersRepository } from '../../ports/users.repository';
import { UpdateUserNameCommand } from './update-user-name.command';
import { User } from '../../../domain/user.entity';
import { UserNotFoundError, UserUnexpectedError } from '../../users.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserUpdatedEvent } from '../../events/user-updated.event';

@Injectable()
export class UpdateUserNameUseCase {
  private readonly logger = new Logger(UpdateUserNameUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateUserNameCommand): Promise<User> {
    this.logger.log('updateUserName', {
      userId: command.userId,
      newName: command.newName,
    });

    try {
      const user = await this.usersRepository.findOneById(command.userId);
      if (!user) {
        throw new UserNotFoundError(command.userId);
      }
      this.logger.debug('user found', {
        userId: user.id,
        currentName: user.name,
      });
      user.name = command.newName;
      const updatedUser = await this.usersRepository.update(user);
      this.logger.log('user name updated successfully', {
        userId: updatedUser.id,
        newName: updatedUser.name,
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
      this.logger.error('Failed to update user name', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: command.userId,
        newName: command.newName,
      });
      throw new UserUnexpectedError(error as Error);
    }
  }
}
