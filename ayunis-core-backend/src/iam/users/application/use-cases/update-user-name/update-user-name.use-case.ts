import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { UpdateUserNameCommand } from './update-user-name.command';
import { User } from '../../../domain/user.entity';
import { UserNotFoundError, UserUnexpectedError } from '../../users.errors';
import { UserUpdatedWebhookEvent } from 'src/common/webhooks/domain/webhook-events/user-updated.webhook-event';
import { SendWebhookCommand } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UpdateUserNameUseCase {
  private readonly logger = new Logger(UpdateUserNameUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
  ) {}

  async execute(command: UpdateUserNameCommand): Promise<User> {
    this.logger.log('updateUserName', {
      userId: command.userId,
      newName: command.newName,
    });

    try {
      const user = await this.usersRepository.findOneById(command.userId);
      if (!user) {
        throw new UserNotFoundError(command.userId);
      }
      this.logger.debug('user found', {
        userId: user.id,
        currentName: user.name,
      });
      user.name = command.newName;
      const updatedUser = await this.usersRepository.update(user);
      this.logger.log('user name updated successfully', {
        userId: updatedUser.id,
        newName: updatedUser.name,
      });

      void this.sendWebhookUseCase.execute(
        new SendWebhookCommand(new UserUpdatedWebhookEvent(updatedUser)),
      );

      return updatedUser;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to update user name', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: command.userId,
        newName: command.newName,
      });
      throw new UserUnexpectedError(error as Error);
    }
  }
}
