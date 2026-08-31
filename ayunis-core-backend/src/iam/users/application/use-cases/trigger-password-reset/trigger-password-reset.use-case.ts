import { Injectable, Logger } from '@nestjs/common';
import { TriggerPasswordResetCommand } from './trigger-password-reset.command';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SendPasswordResetEmailUseCase } from 'src/iam/users/application/use-cases/send-password-reset-email/send-password-reset-email.use-case';
import { SendPasswordResetEmailCommand } from 'src/iam/users/application/use-cases/send-password-reset-email/send-password-reset-email.command';
import { PasswordSetTokenService } from 'src/iam/users/application/services/password-set-token.service';
import { PasswordSetTokenPurpose } from 'src/iam/users/domain/value-objects/password-set-token-purpose.enum';
import { UserUnexpectedError } from 'src/iam/users/application/users.errors';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import type { User } from 'src/iam/users/domain/user.entity';
import { GetOrgAuthenticationPolicyQuery } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.query';
import { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';

@Injectable()
export class TriggerPasswordResetUseCase {
  private readonly logger = new Logger(TriggerPasswordResetUseCase.name);

  constructor(
    private readonly sendPasswordResetEmailUseCase: SendPasswordResetEmailUseCase,
    private readonly passwordSetTokenService: PasswordSetTokenService,
    private readonly usersRepository: UsersRepository,
    private readonly getOrgAuthenticationPolicy: GetOrgAuthenticationPolicyUseCase,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: TriggerPasswordResetCommand): Promise<boolean> {
    this.logger.log({ email: command.email }, 'execute');

    const user = await this.usersRepository.findOneByEmail(command.email);
    if (!user) {
      this.logger.debug({ email: command.email }, 'User not found');
      return false;
    }
    if (user.passwordHash === null) {
      this.logger.debug({ userId: user.id }, 'User has no local password');
      return false;
    }
    const policy = await this.getOrgAuthenticationPolicy.execute(
      new GetOrgAuthenticationPolicyQuery(user.orgId),
    );
    if (!policy.localPasswordLoginEnabled) {
      this.logger.debug(
        { userId: user.id },
        'Local password login is disabled for organization',
      );
      return false;
    }

    await this.sendResetEmail(user);
    return true;
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
