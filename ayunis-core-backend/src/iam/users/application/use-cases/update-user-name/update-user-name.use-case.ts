import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { UpdateUserNameCommand } from './update-user-name.command';
import { User } from 'src/iam/users/domain/user.entity';
import {
  UserNotFoundError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserUpdatedEvent } from 'src/iam/users/application/events/user-updated.event';

@Injectable()
export class UpdateUserNameUseCase {
  private readonly logger = new Logger(UpdateUserNameUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateUserNameCommand): Promise<User> {
    this.logger.log(
      { userId: command.userId, name: command.newName },
      'updateUserName',
    );

    try {
      return await this.updateName(command);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: command.userId,
          name: command.newName,
        },
        'Failed to update user name',
      );
      throw new UserUnexpectedError(error as Error);
    }
  }

  private async updateName(command: UpdateUserNameCommand): Promise<User> {
    const user = await this.usersRepository.findOneById(command.userId);
    if (!user) throw new UserNotFoundError(command.userId);

    this.logger.debug({ userId: user.id, name: user.name }, 'user found');
    user.name = command.newName;
    const updatedUser = await this.usersRepository.update(user);
    this.logger.log(
      { userId: updatedUser.id, name: updatedUser.name },
      'user name updated successfully',
    );
    this.emitUserUpdated(updatedUser);
    return updatedUser;
  }

  private emitUserUpdated(user: User): void {
    this.eventEmitter
      .emitAsync(
        UserUpdatedEvent.EVENT_NAME,
        new UserUpdatedEvent(user.id, user.orgId, user),
      )
      .catch((err: unknown) => {
        this.logger.error(
          {
            error: err instanceof Error ? err.message : 'Unknown error',
            userId: user.id,
          },
          'Failed to emit UserUpdatedEvent',
        );
      });
  }
}
