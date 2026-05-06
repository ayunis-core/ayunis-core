import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { SuperAdminTriggerPasswordResetCommand } from './super-admin-trigger-password-reset.command';
import { SuperAdminTriggerPasswordResetResult } from './super-admin-trigger-password-reset.result';
import { ApplicationError } from 'src/common/errors/base.error';
import { UsersRepository } from '../../ports/users.repository';
import { PasswordResetJwtService } from '../../services/password-reset-jwt.service';
import { SendPasswordResetEmailUseCase } from '../send-password-reset-email/send-password-reset-email.use-case';
import { SendPasswordResetEmailCommand } from '../send-password-reset-email/send-password-reset-email.command';
import { SendSetInitialPasswordEmailUseCase } from '../send-set-initial-password-email/send-set-initial-password-email.use-case';
import { SendSetInitialPasswordEmailCommand } from '../send-set-initial-password-email/send-set-initial-password-email.command';
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
    private readonly sendSetInitialPasswordEmailUseCase: SendSetInitialPasswordEmailUseCase,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    command: SuperAdminTriggerPasswordResetCommand,
  ): Promise<SuperAdminTriggerPasswordResetResult> {
    this.logger.log('Triggering password reset email as super admin', {
      userId: command.userId,
    });

    try {
      const user = await this.usersRepository.findOneById(command.userId);
      if (!user) {
        throw new UserNotFoundError(command.userId);
      }

      const resetUrl = user.activated
        ? await this.sendResetEmail(user)
        : await this.sendActivationEmail(user);

      this.logger.log('Email triggered for user', {
        userId: command.userId,
        email: user.email,
        activated: user.activated,
      });

      return new SuperAdminTriggerPasswordResetResult(resetUrl);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error triggering email as super admin', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
    const resetToken = this.passwordResetJwtService.generatePasswordResetToken({
      userId: user.id,
      email: user.email,
    });

    const resetUrl = this.buildResetUrl(resetToken);

    await this.sendPasswordResetEmailUseCase.execute(
      new SendPasswordResetEmailCommand(user.email, resetToken, user.name),
    );

    return resetUrl;
  }

  private async sendActivationEmail(user: {
    id: UUID;
    email: string;
    name: string;
    orgId: UUID;
  }): Promise<string> {
    const resetToken =
      this.passwordResetJwtService.generateInitialPasswordToken({
        userId: user.id,
        email: user.email,
      });

    const resetUrl = this.buildResetUrl(resetToken);

    await this.sendSetInitialPasswordEmailUseCase.execute(
      new SendSetInitialPasswordEmailCommand(
        user.email,
        user.name,
        resetToken,
        user.orgId,
      ),
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
