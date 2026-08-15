import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { SuperAdminTriggerPasswordResetCommand } from './super-admin-trigger-password-reset.command';
import { SuperAdminTriggerPasswordResetResult } from './super-admin-trigger-password-reset.result';
import { ApplicationError } from 'src/common/errors/base.error';
import { UsersRepository } from '../../ports/users.repository';
import { PasswordSetTokenService } from '../../services/password-set-token.service';
import { PasswordSetTokenPurpose } from 'src/iam/users/domain/value-objects/password-set-token-purpose.enum';
import { SendPasswordResetEmailUseCase } from '../send-password-reset-email/send-password-reset-email.use-case';
import { SendPasswordResetEmailCommand } from '../send-password-reset-email/send-password-reset-email.command';
import {
  UserInvalidInputError,
  UserNotFoundError,
  UserUnexpectedError,
} from '../../users.errors';

@Injectable()
export class SuperAdminTriggerPasswordResetUseCase {
  constructor(
    @InjectPinoLogger(SuperAdminTriggerPasswordResetUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
    private readonly passwordSetTokenService: PasswordSetTokenService,
    private readonly sendPasswordResetEmailUseCase: SendPasswordResetEmailUseCase,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: SuperAdminTriggerPasswordResetCommand,
  ): Promise<SuperAdminTriggerPasswordResetResult> {
    this.logger.info(
      {
        userId: command.userId,
      },
      'Triggering password reset email as super admin',
    );

    try {
      const user = await this.usersRepository.findOneById(command.userId);
      if (!user) {
        throw new UserNotFoundError(command.userId);
      }
      if (user.passwordHash === null) {
        throw new UserInvalidInputError(
          'Password reset is unavailable for users without a local password',
        );
      }

      const resetUrl = await this.sendResetEmail(user);

      this.logger.info(
        {
          userId: command.userId,
          email: user.email,
        },
        'Email triggered for user',
      );

      return new SuperAdminTriggerPasswordResetResult(resetUrl);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error triggering email as super admin',
      );
      throw new UserUnexpectedError(
        error instanceof Error ? error : new Error('Unknown error'),
        'super admin trigger password reset email',
      );
    }
  }

  private async sendResetEmail(user: {
    id: UUID;
    email: string;
    name: string;
  }): Promise<string> {
    const resetToken = await this.passwordSetTokenService.issue({
      userId: user.id,
      purpose: PasswordSetTokenPurpose.RESET,
    });

    const resetUrl = this.buildResetUrl(resetToken);

    await this.sendPasswordResetEmailUseCase.execute(
      new SendPasswordResetEmailCommand(user.email, resetToken, user.name),
    );

    return resetUrl;
  }

  private buildResetUrl(token: string): string {
    const frontendBaseUrl = this.configService.get<string>(
      'app.frontend.baseUrl',
    );
    const passwordResetEndpoint = this.configService.get<string>(
      'app.frontend.passwordResetEndpoint',
    );
    return `${frontendBaseUrl}${passwordResetEndpoint}?token=${token}`;
  }
}
