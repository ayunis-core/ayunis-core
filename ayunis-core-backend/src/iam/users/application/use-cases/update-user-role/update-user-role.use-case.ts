import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersRepository } from '../../ports/users.repository';
import { UpdateUserRoleCommand } from './update-user-role.command';
import { User } from '../../../domain/user.entity';
import {
  UserNotFoundError,
  UserUnauthorizedError,
  UserUnexpectedError,
} from '../../users.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UserUpdatedEvent } from '../../events/user-updated.event';

@Injectable()
export class UpdateUserRoleUseCase {
  private readonly logger = new Logger(UpdateUserRoleUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: UpdateUserRoleCommand): Promise<User> {
    this.logger.log('updateUserRole', {
      userId: command.userId,
      newRole: command.newRole,
    });

    const requesterOrgId = this.contextService.get('orgId');
    if (!requesterOrgId) {
      throw new UserUnauthorizedError('User not authenticated');
    }

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
  }
}
