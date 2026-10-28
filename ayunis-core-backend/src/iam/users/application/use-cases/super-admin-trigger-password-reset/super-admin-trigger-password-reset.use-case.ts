import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { SuperAdminTriggerPasswordResetCommand } from './super-admin-trigger-password-reset.command';
import { SuperAdminTriggerPasswordResetResult } from './super-admin-trigger-password-reset.result';
import { ApplicationError } from 'src/common/errors/base.error';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { PasswordSetTokenService } from 'src/iam/users/application/services/password-set-token.service';
import { PasswordSetTokenPurpose } from 'src/iam/users/domain/value-objects/password-set-token-purpose.enum';
import { SendPasswordResetEmailUseCase } from 'src/iam/users/application/use-cases/send-password-reset-email/send-password-reset-email.use-case';
import { SendPasswordResetEmailCommand } from 'src/iam/users/application/use-cases/send-password-reset-email/send-password-reset-email.command';
import {
  UserInvalidInputError,
  UserNotFoundError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';
import { GetOrgAuthenticationPolicyQuery } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.query';
import { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class SuperAdminTriggerPasswordResetUseCase {
  private readonly logger = new Logger(
    SuperAdminTriggerPasswordResetUseCase.name,
  );

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordSetTokenService: PasswordSetTokenService,
    private readonly sendPasswordResetEmailUseCase: SendPasswordResetEmailUseCase,
    private readonly configService: ConfigService,
    private readonly getOrgAuthenticationPolicy: GetOrgAuthenticationPolicyUseCase,
  ) {}

  async execute(
    command: SuperAdminTriggerPasswordResetCommand,
  ): Promise<SuperAdminTriggerPasswordResetResult> {
    this.logger.log(
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
      await this.assertLocalPasswordLoginEnabled(user);

      const resetUrl = await this.sendResetEmail(user);

      this.logger.log(
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

  private async assertLocalPasswordLoginEnabled(user: User): Promise<void> {
    const policy = await this.getOrgAuthenticationPolicy.execute(
      new GetOrgAuthenticationPolicyQuery(user.orgId),
    );
    if (!policy.localPasswordLoginEnabled) {
      throw new UserInvalidInputError(
        'Password reset is unavailable while the organization requires SSO',
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
