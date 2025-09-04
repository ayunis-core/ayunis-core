import { Injectable, Logger } from '@nestjs/common';
import { ConfirmEmailCommand } from './confirm-email.command';
import { UsersRepository } from '../../ports/users.repository';
import {
  UserEmailMismatchError,
  UserNotFoundError,
  InvalidEmailConfirmationTokenError,
  UserUnexpectedError,
} from '../../users.errors';
import {
  EmailConfirmationJwtService,
  EmailConfirmationJwtPayload,
} from '../../services/email-confirmation-jwt.service';
import { SendWebhookCommand } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { UserUpdatedWebhookEvent } from 'src/common/webhooks/domain/webhook-events/user-updated.webhook-event';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class ConfirmEmailUseCase {
  private readonly logger = new Logger(ConfirmEmailUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly emailConfirmationJwtService: EmailConfirmationJwtService,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
  ) {}

  async execute(command: ConfirmEmailCommand): Promise<void> {
    this.logger.log('execute', { hasToken: !!command.token });

    // Verify and decode the JWT token
    let payload: EmailConfirmationJwtPayload;
    try {
      payload = this.emailConfirmationJwtService.verifyEmailConfirmationToken(
        command.token,
      );
    } catch (error: unknown) {
      this.logger.error('Invalid email confirmation token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new InvalidEmailConfirmationTokenError('Token verification failed');
    }

    try {
      // Find the user in the database
      const user = await this.usersRepository.findOneById(payload.userId);
      if (!user) {
        this.logger.error('User not found', { userId: payload.userId });
        throw new UserNotFoundError(payload.userId);
      }

      // Verify the email matches
      if (user.email !== payload.email) {
        this.logger.error('Email mismatch', {
          userId: payload.userId,
          payloadEmail: payload.email,
          userEmail: user.email,
        });
        throw new UserEmailMismatchError(payload.userId);
      }

      // Confirm the email
      user.emailVerified = true;
      await this.usersRepository.update(user);

      this.logger.debug('Email confirmed successfully', {
        userId: user.id,
        email: user.email,
      });

      // Send webhook asynchronously (don't block the main operation)
      void this.sendWebhookUseCase.execute(
        new SendWebhookCommand(new UserUpdatedWebhookEvent(user)),
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to confirm email', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UserUnexpectedError(error as Error);
    }
  }
}
