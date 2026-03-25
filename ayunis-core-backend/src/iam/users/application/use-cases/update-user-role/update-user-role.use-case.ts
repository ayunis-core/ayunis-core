import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersRepository } from '../../ports/users.repository';
import { UpdateUserRoleCommand } from './update-user-role.command';
import { User } from '../../../domain/user.entity';
import { UserNotFoundError, UserUnexpectedError } from '../../users.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserUpdatedEvent } from '../../events/user-updated.event';

@Injectable()
export class UpdateUserRoleUseCase {
  private readonly logger = new Logger(UpdateUserRoleUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateUserRoleCommand): Promise<User> {
    this.logger.log('updateUserRole', {
      userId: command.userId,
      newRole: command.newRole,
    });

    try {
      // Find the user
      const user = await this.usersRepository.findOneById(command.userId);
      if (!user) {
        throw new UserNotFoundError(command.userId);
      }

      // Update the role
      user.role = command.newRole;

      // Save the updated user
      const updatedUser = await this.usersRepository.update(user);

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
      this.logger.error('Error updating user role', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UserUnexpectedError(error as Error);
    }
  }
}
