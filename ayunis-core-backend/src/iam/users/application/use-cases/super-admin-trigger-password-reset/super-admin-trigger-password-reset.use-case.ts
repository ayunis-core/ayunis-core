import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuperAdminTriggerPasswordResetCommand } from './super-admin-trigger-password-reset.command';
import { SuperAdminTriggerPasswordResetResult } from './super-admin-trigger-password-reset.result';
import { ApplicationError } from 'src/common/errors/base.error';
import { UsersRepository } from '../../ports/users.repository';
import { PasswordResetJwtService } from '../../services/password-reset-jwt.service';
import { SendPasswordResetEmailUseCase } from '../send-password-reset-email/send-password-reset-email.use-case';
import { SendPasswordResetEmailCommand } from '../send-password-reset-email/send-password-reset-email.command';
import { UserNotFoundError, UserUnexpectedError } from '../../users.errors';

@Injectable()
export class SuperAdminTriggerPasswordResetUseCase {
  private readonly logger = new Logger(
    SuperAdminTriggerPasswordResetUseCase.name,
  );

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordResetJwtService: PasswordResetJwtService,
    private readonly sendPasswordResetEmailUseCase: SendPasswordResetEmailUseCase,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: SuperAdminTriggerPasswordResetCommand,
  ): Promise<SuperAdminTriggerPasswordResetResult> {
    this.logger.log('Triggering password reset as super admin', {
      userId: command.userId,
    });

    try {
      const user = await this.usersRepository.findOneById(command.userId);
      if (!user) {
        throw new UserNotFoundError(command.userId);
      }

      const resetToken =
        this.passwordResetJwtService.generatePasswordResetToken({
          userId: user.id,
          email: user.email,
        });

      const frontendBaseUrl = this.configService.get<string>(
        'app.frontend.baseUrl',
      );
      const passwordResetEndpoint = this.configService.get<string>(
        'app.frontend.passwordResetEndpoint',
      );
      const resetUrl = `${frontendBaseUrl}${passwordResetEndpoint}?token=${resetToken}`;

      await this.sendPasswordResetEmailUseCase.execute(
        new SendPasswordResetEmailCommand(user.email, resetToken, user.name),
      );

      this.logger.log('Password reset triggered for user', {
        userId: command.userId,
        email: user.email,
      });

      return new SuperAdminTriggerPasswordResetResult(resetUrl);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error triggering password reset as super admin', {
        error: error as Error,
      });
      throw new UserUnexpectedError(
        error as Error,
        'super admin trigger password reset',
      );
    }
  }
}
