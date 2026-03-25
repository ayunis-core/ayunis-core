import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersRepository } from '../../ports/users.repository';
import { DeleteUserCommand } from './delete-user.command';
import { UserNotFoundError, UserUnauthorizedError } from '../../users.errors';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { DeleteInviteByEmailUseCase } from 'src/iam/invites/application/use-cases/delete-invite-by-email/delete-invite-by-email.use-case';
import { DeleteInviteByEmailCommand } from 'src/iam/invites/application/use-cases/delete-invite-by-email/delete-invite-by-email.command';
import { ContextService } from 'src/common/context/services/context.service';
import { Transactional } from '@nestjs-cls/transactional';
import { InviteNotFoundError } from 'src/iam/invites/application/invites.errors';
import { UserDeletedEvent } from '../../events/user-deleted.event';

@Injectable()
export class DeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly deleteInviteByEmailUseCase: DeleteInviteByEmailUseCase,
  ) {}

  @Transactional()
  async execute(command: DeleteUserCommand): Promise<void> {
    this.logger.log('deleteUser', { userId: command.userId });
    const requestingUserId = this.contextService.get('userId');
    const requestUserOrgId = this.contextService.get('orgId');
    if (!requestingUserId || !requestUserOrgId) {
      throw new UserUnauthorizedError('User not authenticated');
    }
    const orgRole = this.contextService.get('role');
    const systemRole = this.contextService.get('systemRole');

    const userToDelete = await this.usersRepository.findOneById(command.userId);
    if (!userToDelete) {
      this.logger.error('User not found', { userId: command.userId });
      throw new UserNotFoundError(command.userId);
    }

    // Super admins can delete any user, regular admins can only delete users from their org
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
    const isOrgAdmin =
      orgRole === UserRole.ADMIN && requestUserOrgId === userToDelete.orgId;
    if (!isSuperAdmin && !isOrgAdmin) {
      throw new UserUnauthorizedError(
        'You are not allowed to delete this user',
      );
    }

    await this.usersRepository.delete(command.userId);
    await this.deleteInviteByEmailUseCase
      .execute(
        new DeleteInviteByEmailCommand({
          email: userToDelete.email,
          requestingUserId,
        }),
      )
      .catch((error) => {
        if (error instanceof InviteNotFoundError) {
          return;
        }
        throw error;
      });
    this.eventEmitter
      .emitAsync(
        UserDeletedEvent.EVENT_NAME,
        new UserDeletedEvent(command.userId, userToDelete.orgId),
      )
      .catch((err: unknown) => {
        this.logger.error('Failed to emit UserDeletedEvent', {
          error: err instanceof Error ? err.message : 'Unknown error',
          userId: command.userId,
        });
      });
  }
}
