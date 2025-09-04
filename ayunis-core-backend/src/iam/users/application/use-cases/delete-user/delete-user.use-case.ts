import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { DeleteUserCommand } from './delete-user.command';
import { UserNotFoundError, UserUnauthorizedError } from '../../users.errors';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SendWebhookCommand } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { UserDeletedWebhookEvent } from 'src/common/webhooks/domain/webhook-events/user-deleted.webhook-event';

@Injectable()
export class DeleteUserUseCase {
  private readonly logger = new Logger(DeleteUserUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    this.logger.log('deleteUser', { userId: command.userId });
    const requestUser = await this.usersRepository.findOneById(
      command.requestUserId,
    );
    if (!requestUser) {
      throw new UserNotFoundError(command.requestUserId);
    }
    if (
      requestUser.orgId !== command.orgId ||
      requestUser.role !== UserRole.ADMIN
    ) {
      throw new UserUnauthorizedError(
        'You are not allowed to delete this user',
      );
    }

    await this.usersRepository.delete(command.userId);

    void this.sendWebhookUseCase.execute(
      new SendWebhookCommand(new UserDeletedWebhookEvent(command.userId)),
    );
  }
}
