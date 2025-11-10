import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { DeleteUserCommand } from './delete-user.command';
import { UserNotFoundError, UserUnauthorizedError } from '../../users.errors';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SendWebhookCommand } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { UserDeletedWebhookEvent } from 'src/common/webhooks/domain/webhook-events/user-deleted.webhook-event';
import { DeleteInviteByEmailUseCase } from 'src/iam/invites/application/use-cases/delete-invite-by-email/delete-invite-by-email.use-case';
import { DeleteInviteByEmailCommand } from 'src/iam/invites/application/use-cases/delete-invite-by-email/delete-invite-by-email.command';
import { ContextService } from 'src/common/context/services/context.service';
import { Transactional } from '@nestjs-cls/transactional';
import { InviteNotFoundError } from 'src/iam/invites/application/invites.errors';

@Injectable()
export class DeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly usersRepository: UsersRepository,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
    private readonly deleteInviteByEmailUseCase: DeleteInviteByEmailUseCase,
  ) {}

  @Transactional()
  async execute(command: DeleteUserCommand): Promise<void> {
    this.logger.log('deleteUser', { userId: command.userId });
    const requestingUserId = this.contextService.get('userId');
    if (!requestingUserId) {
      this.logger.error('User not authenticated');
      throw new UserUnauthorizedError('User not authenticated');
    }
    const requestUser =
      await this.usersRepository.findOneById(requestingUserId);
    if (!requestUser) {
      this.logger.error('User not found', { userId: requestingUserId });
      throw new UserNotFoundError(requestingUserId);
    }
    if (
      requestUser.orgId !== command.orgId ||
      requestUser.role !== UserRole.ADMIN
    ) {
      throw new UserUnauthorizedError(
        'You are not allowed to delete this user',
      );
    }
    const userToDelete = await this.usersRepository.findOneById(command.userId);
    if (!userToDelete) {
      this.logger.error('User not found', { userId: command.userId });
      throw new UserNotFoundError(command.userId);
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
    void this.sendWebhookUseCase.execute(
      new SendWebhookCommand(new UserDeletedWebhookEvent(command.userId)),
    );
  }
}
