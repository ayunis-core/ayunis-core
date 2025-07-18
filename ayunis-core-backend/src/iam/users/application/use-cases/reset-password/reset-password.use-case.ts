import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { ResetPasswordCommand } from './reset-password.command';
import {
  UnexpectedAuthenticationError,
  InvalidTokenError,
} from '../../../../authentication/application/authentication.errors';
import { HashTextCommand } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.command';
import { HashTextUseCase } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.use-case';
import { HashingError } from 'src/iam/hashing/application/hashing.errors';
import { PasswordResetJwtService } from '../../services/password-reset-jwt.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { IsValidPasswordUseCase } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { IsValidPasswordQuery } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.query';
import { InvalidPasswordError } from '../../../../authentication/application/authentication.errors';

@Injectable()
export class ResetPasswordUseCase {
  private readonly logger = new Logger(ResetPasswordUseCase.name);

  constructor(
    private readonly passwordResetJwtService: PasswordResetJwtService,
    private readonly hashTextUseCase: HashTextUseCase,
    private readonly isValidPasswordUseCase: IsValidPasswordUseCase,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<void> {
    this.logger.log('resetPassword', { hasToken: !!command.resetToken });

    try {
      // Verify the reset token
      this.logger.debug('Verifying password reset token');
      const tokenPayload =
        this.passwordResetJwtService.verifyPasswordResetToken(
          command.resetToken,
        );

      // Check if passwords match
      if (command.newPassword !== command.newPasswordConfirmation) {
        this.logger.warn('Password confirmation mismatch', {
          userId: tokenPayload.userId,
        });
        throw new InvalidPasswordError('Passwords do not match');
      }

      // Validate password strength
      const isValidPassword = await this.isValidPasswordUseCase.execute(
        new IsValidPasswordQuery(command.newPassword),
      );

      if (!isValidPassword) {
        this.logger.warn('Password does not meet security requirements', {
          userId: tokenPayload.userId,
        });
        throw new InvalidPasswordError(
          'Password does not meet security requirements',
        );
      }

      // Find the user
      const user = await this.usersRepository.findOneById(tokenPayload.userId);
      if (!user) {
        this.logger.error('User not found during password reset', {
          userId: tokenPayload.userId,
          email: tokenPayload.email,
        });
        throw new InvalidTokenError('Invalid token - user not found');
      }

      // Verify the email matches the token
      if (user.email !== tokenPayload.email) {
        this.logger.error('Email mismatch during password reset', {
          userId: tokenPayload.userId,
          tokenEmail: tokenPayload.email,
          userEmail: user.email,
        });
        throw new InvalidTokenError('Invalid token - email mismatch');
      }

      // Hash the new password
      this.logger.debug('Hashing new password', {
        userId: user.id,
      });
      const newHashedPassword = await this.hashTextUseCase
        .execute(new HashTextCommand(command.newPassword))
        .catch((error) => {
          if (error instanceof HashingError) {
            throw error;
          }
          this.logger.error('Password hashing failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: user.id,
          });
          throw new InvalidPasswordError('Password hashing failed');
        });

      // Update the user's password
      user.passwordHash = newHashedPassword;
      await this.usersRepository.update(user);

      this.logger.debug('Password reset successfully', {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Password reset failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnexpectedAuthenticationError(error);
    }
  }
}
