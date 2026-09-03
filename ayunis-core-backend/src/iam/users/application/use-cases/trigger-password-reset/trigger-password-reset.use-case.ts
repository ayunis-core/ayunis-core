import { Injectable, Logger } from '@nestjs/common';
import { TriggerPasswordResetCommand } from './trigger-password-reset.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedAuthenticationError } from 'src/iam/authentication/application/authentication.errors';
import { SendPasswordResetEmailUseCase } from 'src/iam/users/application/use-cases/send-password-reset-email/send-password-reset-email.use-case';
import { SendPasswordResetEmailCommand } from 'src/iam/users/application/use-cases/send-password-reset-email/send-password-reset-email.command';
import { PasswordSetTokenService } from 'src/iam/users/application/services/password-set-token.service';
import { PasswordSetTokenPurpose } from 'src/iam/users/domain/value-objects/password-set-token-purpose.enum';
import { UserNotFoundError } from 'src/iam/users/application/users.errors';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class TriggerPasswordResetUseCase {
  private readonly logger = new Logger(TriggerPasswordResetUseCase.name);

  constructor(
    private readonly sendPasswordResetEmailUseCase: SendPasswordResetEmailUseCase,
    private readonly passwordSetTokenService: PasswordSetTokenService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(command: TriggerPasswordResetCommand): Promise<void> {
    try {
      this.logger.log({ email: command.email }, 'execute');

      const user = await this.usersRepository.findOneByEmail(command.email);
      if (!user) {
        this.logger.debug({ email: command.email }, 'User not found');
        return;
      }
      if (user.passwordHash === null) {
        this.logger.debug({ userId: user.id }, 'User has no local password');
        return;
      }

      await this.sendResetEmail(user);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return;
      }
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: command.email,
        },
        'Error triggering password reset',
      );
      throw new UnexpectedAuthenticationError(error);
    }
  }

  private async sendResetEmail(user: User): Promise<void> {
    const resetToken = await this.passwordSetTokenService.issue({
      userId: user.id,
      purpose: PasswordSetTokenPurpose.RESET,
    });

    await this.sendPasswordResetEmailUseCase.execute(
      new SendPasswordResetEmailCommand(user.email, resetToken, user.name),
    );

    this.logger.debug(
      {
        userId: user.id,
        email: user.email,
      },
      'Password reset email sent',
    );
  }
}
