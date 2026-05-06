import { Injectable, Logger } from '@nestjs/common';
import { TriggerSetInitialPasswordCommand } from './trigger-set-initial-password.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedAuthenticationError } from '../../../../authentication/application/authentication.errors';
import { SendSetInitialPasswordEmailUseCase } from '../send-set-initial-password-email/send-set-initial-password-email.use-case';
import { SendSetInitialPasswordEmailCommand } from '../send-set-initial-password-email/send-set-initial-password-email.command';
import { PasswordResetJwtService } from '../../services/password-reset-jwt.service';
import { UserNotFoundError } from '../../users.errors';
import { UsersRepository } from '../../ports/users.repository';

/**
 * Onboarding entry point: when an admin or super-admin creates a user
 * directly (without invite), this triggers the "Konto aktivieren" flow.
 * The user receives a welcoming email pointing them to the password-reset
 * page, where they set their initial password.
 */
@Injectable()
export class TriggerSetInitialPasswordUseCase {
  private readonly logger = new Logger(TriggerSetInitialPasswordUseCase.name);

  constructor(
    private readonly sendSetInitialPasswordEmailUseCase: SendSetInitialPasswordEmailUseCase,
    private readonly passwordResetJwtService: PasswordResetJwtService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async execute(command: TriggerSetInitialPasswordCommand): Promise<void> {
    try {
      this.logger.log('execute', { email: command.email });

      const user = await this.usersRepository.findOneByEmail(command.email);
      if (!user) {
        this.logger.debug('User not found', { email: command.email });
        return;
      }

      const resetToken =
        this.passwordResetJwtService.generatePasswordResetToken({
          userId: user.id,
          email: user.email,
        });

      await this.sendSetInitialPasswordEmailUseCase.execute(
        new SendSetInitialPasswordEmailCommand(
          user.email,
          user.name,
          resetToken,
          command.orgId,
        ),
      );

      this.logger.debug('Set-initial-password email triggered', {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) return;
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error triggering set-initial-password', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: command.email,
      });
      throw new UnexpectedAuthenticationError(error);
    }
  }
}
