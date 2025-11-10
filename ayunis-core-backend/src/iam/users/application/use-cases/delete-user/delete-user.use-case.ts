import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { DeleteUserCommand } from './delete-user.command';
import {
  UserNotFoundError,
  UserUnauthorizedError,
  CannotDeleteLastAdminError,
} from '../../users.errors';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SendWebhookCommand } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { UserDeletedWebhookEvent } from 'src/common/webhooks/domain/webhook-events/user-deleted.webhook-event';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';

@Injectable()
export class DeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
    private readonly invitesRepository: InvitesRepository,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    this.logger.log('deleteUser', { userId: command.userId });
    const requestUser = await this.usersRepository.findOneById(
      command.requestUserId,
    );
    if (!requestUser) {
      throw new UserNotFoundError(command.requestUserId);
    }

    const userToDelete = await this.usersRepository.findOneById(
      command.userId,
    );
    if (!userToDelete) {
      throw new UserNotFoundError(command.userId);
    }

    const isSelfDeletion = command.requestUserId === command.userId;
    const isAdminDeletingOther =
      requestUser.role === UserRole.ADMIN &&
      requestUser.orgId === command.orgId &&
      userToDelete.orgId === command.orgId;

    if (!isSelfDeletion && !isAdminDeletingOther) {
      throw new UserUnauthorizedError(
        'You can only delete yourself or users in your organization (if you are an admin)',
      );
    }

    if (userToDelete.role === UserRole.ADMIN) {
      const orgUsers = await this.usersRepository.findManyByOrgId(
        command.orgId,
      );
      const adminCount = orgUsers.filter(
        (user) => user.role === UserRole.ADMIN && user.id !== command.userId,
      ).length;

      if (adminCount === 0) {
        this.logger.warn('Attempted to delete last admin', {
          userId: command.userId,
          orgId: command.orgId,
        });
        throw new CannotDeleteLastAdminError(command.orgId);
      }
    }

    await this.invitesRepository.deleteByEmail(userToDelete.email);
    await this.usersRepository.delete(command.userId);

    void this.sendWebhookUseCase.execute(
      new SendWebhookCommand(new UserDeletedWebhookEvent(command.userId)),
    );
  }
}
