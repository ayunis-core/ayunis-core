import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { UpdateUserRoleCommand } from './update-user-role.command';
import { User } from '../../../domain/user.entity';
import { UserNotFoundError, UserUnexpectedError } from '../../users.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { SendWebhookCommand } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { UserUpdatedWebhookEvent } from 'src/common/webhooks/domain/webhook-events/user-updated.webhook-event';

@Injectable()
export class UpdateUserRoleUseCase {
  private readonly logger = new Logger(UpdateUserRoleUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
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

      void this.sendWebhookUseCase.execute(
        new SendWebhookCommand(new UserUpdatedWebhookEvent(updatedUser)),
      );

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
