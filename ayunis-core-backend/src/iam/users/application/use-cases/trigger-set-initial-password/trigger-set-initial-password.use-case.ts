import { Injectable, Logger } from '@nestjs/common';
import { TriggerSetInitialPasswordCommand } from './trigger-set-initial-password.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedAuthenticationError } from 'src/iam/authentication/application/authentication.errors';
import { SendSetInitialPasswordEmailUseCase } from 'src/iam/users/application/use-cases/send-set-initial-password-email/send-set-initial-password-email.use-case';
import { SendSetInitialPasswordEmailCommand } from 'src/iam/users/application/use-cases/send-set-initial-password-email/send-set-initial-password-email.command';
import { PasswordSetTokenService } from 'src/iam/users/application/services/password-set-token.service';
import { PasswordSetTokenPurpose } from 'src/iam/users/domain/value-objects/password-set-token-purpose.enum';
import { UserNotFoundError } from 'src/iam/users/application/users.errors';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { GetOrgAuthenticationPolicyQuery } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.query';
import { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';

@Injectable()
export class TriggerSetInitialPasswordUseCase {
  private readonly logger = new Logger(TriggerSetInitialPasswordUseCase.name);

  constructor(
    private readonly sendSetInitialPasswordEmailUseCase: SendSetInitialPasswordEmailUseCase,
    private readonly passwordSetTokenService: PasswordSetTokenService,
    private readonly usersRepository: UsersRepository,
    private readonly getOrgAuthenticationPolicy: GetOrgAuthenticationPolicyUseCase,
  ) {}

  async execute(command: TriggerSetInitialPasswordCommand): Promise<void> {
    try {
      this.logger.log({ email: command.email }, 'execute');

      const user = await this.usersRepository.findOneByEmail(command.email);
      if (!user) {
        this.logger.debug({ email: command.email }, 'User not found');
        return;
      }
      const policy = await this.getOrgAuthenticationPolicy.execute(
        new GetOrgAuthenticationPolicyQuery(user.orgId),
      );
      if (!policy.localPasswordLoginEnabled) {
        this.logger.debug(
          { userId: user.id },
          'Initial password is unavailable for organization',
        );
        return;
      }

      const resetToken = await this.passwordSetTokenService.issue({
        userId: user.id,
        purpose: PasswordSetTokenPurpose.INITIAL,
      });

      await this.sendSetInitialPasswordEmailUseCase.execute(
        new SendSetInitialPasswordEmailCommand(
          user.email,
          user.name,
          resetToken,
          command.orgId,
        ),
      );

      this.logger.debug(
        {
          userId: user.id,
          email: user.email,
        },
        'Set-initial-password email triggered',
      );
    } catch (error) {
      if (error instanceof UserNotFoundError) return;
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: command.email,
        },
        'Error triggering set-initial-password',
      );
      throw new UnexpectedAuthenticationError(error);
    }
  }
}
