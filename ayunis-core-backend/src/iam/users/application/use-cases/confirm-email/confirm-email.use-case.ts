import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfirmEmailCommand } from './confirm-email.command';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import {
  UserEmailMismatchError,
  UserNotFoundError,
  InvalidEmailConfirmationTokenError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';
import {
  EmailConfirmationJwtService,
  EmailConfirmationJwtPayload,
} from 'src/iam/users/application/services/email-confirmation-jwt.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserUpdatedEvent } from 'src/iam/users/application/events/user-updated.event';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class ConfirmEmailUseCase {
  private readonly logger = new Logger(ConfirmEmailUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly emailConfirmationJwtService: EmailConfirmationJwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ConfirmEmailCommand): Promise<void> {
    this.logger.log({ hasToken: !!command.token }, 'execute');
    const payload = this.verifyToken(command.token);
    try {
      await this.confirmEmail(payload);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to confirm email',
      );
      throw new UserUnexpectedError(error as Error);
    }
  }

  private verifyToken(token: string): EmailConfirmationJwtPayload {
    try {
      return this.emailConfirmationJwtService.verifyEmailConfirmationToken(
        token,
      );
    } catch (error: unknown) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Invalid email confirmation token',
      );
      throw new InvalidEmailConfirmationTokenError('Token verification failed');
    }
  }

  private async confirmEmail(
    payload: EmailConfirmationJwtPayload,
  ): Promise<void> {
    const user = await this.usersRepository.findOneById(payload.userId);
    if (!user) {
      this.logger.error({ userId: payload.userId }, 'User not found');
      throw new UserNotFoundError(payload.userId);
    }
    if (user.email !== payload.email) {
      this.logger.error(
        { userId: payload.userId, email: payload.email, userEmail: user.email },
        'Email mismatch',
      );
      throw new UserEmailMismatchError(payload.userId);
    }

    user.emailVerified = true;
    await this.usersRepository.update(user);
    this.logger.debug(
      { userId: user.id, email: user.email },
      'Email confirmed successfully',
    );
    this.emitUserUpdated(user);
  }

  private emitUserUpdated(user: User): void {
    this.eventEmitter
      .emitAsync(
        UserUpdatedEvent.EVENT_NAME,
        new UserUpdatedEvent(user.id, user.orgId, user),
      )
      .catch((err: unknown) => {
        this.logger.error(
          {
            error: err instanceof Error ? err.message : 'Unknown error',
            userId: user.id,
          },
          'Failed to emit UserUpdatedEvent',
        );
      });
  }
}
