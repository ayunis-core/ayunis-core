import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersRepository } from '../../ports/users.repository';
import { UpdateUserNameCommand } from './update-user-name.command';
import { User } from 'src/iam/users/domain/user.entity';
import { UserNotFoundError, UserUnexpectedError } from '../../users.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserUpdatedEvent } from '../../events/user-updated.event';

@Injectable()
export class UpdateUserNameUseCase {
  constructor(
    @InjectPinoLogger(UpdateUserNameUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateUserNameCommand): Promise<User> {
    this.logger.info(
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
    this.logger.info(
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
