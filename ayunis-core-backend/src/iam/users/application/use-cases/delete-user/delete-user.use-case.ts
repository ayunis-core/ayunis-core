import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
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
import { UserDeletionRequestedEvent } from '../../events/user-deletion-requested.event';
import { runDeferredCleanup } from 'src/common/events/run-deferred-cleanup';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class DeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly deleteInviteByEmailUseCase: DeleteInviteByEmailUseCase,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    this.logger.log('deleteUser', { userId: command.userId });
    const requestingUserId = this.contextService.get('userId');
    if (!requestingUserId) {
      throw new UserUnauthorizedError('User not authenticated');
    }

    const userToDelete = await this.usersRepository.findOneById(command.userId);
    if (!userToDelete) {
      this.logger.error('User not found', { userId: command.userId });
      throw new UserNotFoundError(command.userId);
    }
    this.assertAllowedToDelete(command, userToDelete);

    // Two-phase cleanup: listeners resolve dependent data that database
    // cascades cannot reach (MinIO assets, in-flight source processing) while
    // the owning rows still exist, and defer the irreversible work; it runs
    // only after the row delete succeeds.
    const event = new UserDeletionRequestedEvent(
      userToDelete.id,
      userToDelete.orgId,
    );
    await this.eventEmitter.emitAsync(
      UserDeletionRequestedEvent.EVENT_NAME,
      event,
    );

    await this.deleteUserRows(userToDelete, requestingUserId);

    await runDeferredCleanup(event.takeCleanupTasks(), this.logger);
    this.emitUserDeleted(userToDelete);
  }

  private assertAllowedToDelete(
    command: DeleteUserCommand,
    userToDelete: User,
  ): void {
    const requestUserOrgId = this.contextService.get('orgId');
    if (!requestUserOrgId) {
      throw new UserUnauthorizedError('User not authenticated');
    }
    // Super admins can delete any user, regular admins can only delete users
    // from their own org. The passed command.orgId must match both the
    // requester's org (from context) and the target user's org to prevent
    // cross-org deletion.
    const isSuperAdmin =
      this.contextService.get('systemRole') === SystemRole.SUPER_ADMIN;
    const isOrgAdmin =
      this.contextService.get('role') === UserRole.ADMIN &&
      requestUserOrgId === command.orgId &&
      command.orgId === userToDelete.orgId;
    if (!isSuperAdmin && !isOrgAdmin) {
      throw new UserUnauthorizedError(
        'You are not allowed to delete this user',
      );
    }
  }

  // Kept transactional on its own so deferred cleanup in execute() stays
  // outside the transaction boundary: irreversible external deletes must not
  // run before the row delete is committed.
  @Transactional()
  private async deleteUserRows(
    userToDelete: User,
    requestingUserId: UUID,
  ): Promise<void> {
    await this.usersRepository.delete(userToDelete.id);
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
  }

  private emitUserDeleted(user: User): void {
    this.eventEmitter
      .emitAsync(
        UserDeletedEvent.EVENT_NAME,
        new UserDeletedEvent(user.id, user.orgId, user.email),
      )
      .catch((err: unknown) => {
        this.logger.error('Failed to emit UserDeletedEvent', {
          error: err instanceof Error ? err.message : 'Unknown error',
          userId: user.id,
        });
      });
  }
}
