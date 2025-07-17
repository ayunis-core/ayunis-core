import { Injectable, Logger } from '@nestjs/common';
import { ConfirmEmailCommand } from './confirm-email.command';
import { UsersRepository } from '../../ports/users.repository';
import {
  UserEmailMismatchError,
  UserNotFoundError,
  InvalidEmailConfirmationTokenError,
} from '../../users.errors';
import {
  EmailConfirmationJwtService,
  EmailConfirmationJwtPayload,
} from '../../services/email-confirmation-jwt.service';

@Injectable()
export class ConfirmEmailUseCase {
  private readonly logger = new Logger(ConfirmEmailUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly emailConfirmationJwtService: EmailConfirmationJwtService,
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
  }
}
