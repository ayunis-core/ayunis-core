import { Injectable, Logger } from '@nestjs/common';
import { TriggerPasswordResetCommand } from './trigger-password-reset.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedAuthenticationError } from '../../../../authentication/application/authentication.errors';
import { SendPasswordResetEmailUseCase } from '../send-password-reset-email/send-password-reset-email.use-case';
import { SendPasswordResetEmailCommand } from '../send-password-reset-email/send-password-reset-email.command';
import { PasswordResetJwtService } from '../../services/password-reset-jwt.service';
import { UserNotFoundError } from 'src/iam/users/application/users.errors';
import { UsersRepository } from '../../ports/users.repository';

@Injectable()
export class TriggerPasswordResetUseCase {
  private readonly logger = new Logger(TriggerPasswordResetUseCase.name);

  constructor(
    private readonly sendPasswordResetEmailUseCase: SendPasswordResetEmailUseCase,
    private readonly passwordResetJwtService: PasswordResetJwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(command: TriggerPasswordResetCommand): Promise<void> {
    try {
      this.logger.log('execute', { email: command.email });

      // Find the user by email
      const user = await this.usersRepository.findOneByEmail(command.email);
      if (!user) {
        this.logger.debug('User not found', { email: command.email });
        return; // Silently return without error for security reasons
      }

      // Generate password reset token
      this.logger.debug('Generating password reset token', {
        userId: user.id,
        email: user.email,
      });
      const resetToken =
        this.passwordResetJwtService.generatePasswordResetToken({
          userId: user.id,
          email: user.email,
        });

      // Send password reset email
      await this.sendPasswordResetEmailUseCase.execute(
        new SendPasswordResetEmailCommand(user.email, resetToken, user.name),
      );

      this.logger.debug('Password reset email sent successfully', {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return; // Silently return without error for security reasons
      }
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error triggering password reset', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: command.email,
      });
      throw new UnexpectedAuthenticationError(error);
    }
  }
}
