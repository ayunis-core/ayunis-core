import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { UpdateUserRoleCommand } from './update-user-role.command';
import { User } from 'src/iam/users/domain/user.entity';
import {
  UserNotFoundError,
  UserUnauthorizedError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UserUpdatedEvent } from 'src/iam/users/application/events/user-updated.event';

@Injectable()
export class UpdateUserRoleUseCase {
  private readonly logger = new Logger(UpdateUserRoleUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateUserRoleCommand): Promise<User> {
    this.logger.log(
      {
        userId: command.userId,
        newRole: command.newRole,
      },
      'updateUserRole',
    );

    const requesterOrgId = this.contextService.get('orgId');
    if (!requesterOrgId) {
      throw new UserUnauthorizedError('User not authenticated');
    }

    try {
      // Find the user
      const user = await this.usersRepository.findOneById(command.userId);
      if (!user) {
        throw new UserNotFoundError(command.userId);
      }

      // Prevent cross-org role changes: the target user must belong to the
      // requesting admin's organization.
      if (user.orgId !== requesterOrgId) {
        throw new UserUnauthorizedError(
          'You are not allowed to update this user',
        );
      }

      // Update the role
      user.role = command.newRole;

      // Save the updated user
      const updatedUser = await this.usersRepository.update(user);

      this.emitUserUpdated(updatedUser);

      return updatedUser;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error updating user role',
      );
      throw new UserUnexpectedError(error as Error);
    }
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
