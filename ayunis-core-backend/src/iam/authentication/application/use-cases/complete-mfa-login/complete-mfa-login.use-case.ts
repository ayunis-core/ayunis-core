import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { LocalPasswordLoginPolicyService } from 'src/iam/authentication/application/services/local-password-login-policy.service';
import { UnexpectedAuthenticationError } from 'src/iam/authentication/application/authentication.errors';
import { CompleteMfaLoginCommand } from 'src/iam/authentication/application/use-cases/complete-mfa-login/complete-mfa-login.command';
import { LoginCommand } from 'src/iam/authentication/application/use-cases/login/login.command';
import { LoginUseCase } from 'src/iam/authentication/application/use-cases/login/login.use-case';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import type { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { ConfirmTotpCommand } from 'src/iam/mfa/application/use-cases/confirm-totp/confirm-totp.command';
import { ConfirmTotpUseCase } from 'src/iam/mfa/application/use-cases/confirm-totp/confirm-totp.use-case';
import { VerifyMfaCodeCommand } from 'src/iam/mfa/application/use-cases/verify-mfa-code/verify-mfa-code.command';
import { VerifyMfaCodeUseCase } from 'src/iam/mfa/application/use-cases/verify-mfa-code/verify-mfa-code.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import type { User } from 'src/iam/users/domain/user.entity';
import {
  InvalidMfaCodeError,
  MfaLockedError,
} from 'src/iam/mfa/application/mfa.errors';

export interface CompleteMfaLoginResult {
  tokens: AuthTokens;
  recoveryCodes: string[] | null;
}

type MfaRejection = InvalidMfaCodeError | MfaLockedError;

@Injectable()
export class CompleteMfaLoginUseCase {
  private readonly logger = new Logger(CompleteMfaLoginUseCase.name);

  constructor(
    private readonly findUserById: FindUserByIdUseCase,
    private readonly localPasswordLoginPolicy: LocalPasswordLoginPolicyService,
    private readonly verifyMfaCode: VerifyMfaCodeUseCase,
    private readonly confirmTotp: ConfirmTotpUseCase,
    private readonly login: LoginUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAuthenticationError)
  async execute(
    command: CompleteMfaLoginCommand,
  ): Promise<CompleteMfaLoginResult> {
    this.logger.log({ userId: command.userId }, 'completeMfaLogin');
    const result = await this.complete(command);
    // Commit failed-attempt accounting before rejecting the request.
    if (
      result instanceof InvalidMfaCodeError ||
      result instanceof MfaLockedError
    )
      throw result;
    return result;
  }

  @Transactional()
  private async complete(
    command: CompleteMfaLoginCommand,
  ): Promise<CompleteMfaLoginResult | MfaRejection> {
    const user = await this.findUserById.execute(
      new FindUserByIdQuery(command.userId),
    );
    await this.localPasswordLoginPolicy.assertSessionIssuanceAllowed(
      user.orgId,
      command.authenticationMethod,
    );
    const recoveryCodes = await this.completeFactor(command);
    if (
      recoveryCodes instanceof InvalidMfaCodeError ||
      recoveryCodes instanceof MfaLockedError
    )
      return recoveryCodes;
    const tokens = await this.login.execute(
      new LoginCommand(
        this.toActiveUser(user),
        command.authenticationMethod,
        command.zitadelSessionId,
      ),
    );
    return { tokens, recoveryCodes };
  }

  private async completeFactor(
    command: CompleteMfaLoginCommand,
  ): Promise<string[] | null | MfaRejection> {
    try {
      if (command.operation === 'confirmEnrollment') {
        return await this.confirmTotp.execute(
          new ConfirmTotpCommand(command.userId, command.code),
        );
      }
      await this.verifyMfaCode.execute(
        new VerifyMfaCodeCommand(command.userId, command.code),
      );
      return null;
    } catch (error) {
      if (
        error instanceof InvalidMfaCodeError ||
        error instanceof MfaLockedError
      )
        return error;
      throw error;
    }
  }

  private toActiveUser(user: User): ActiveUser {
    return new ActiveUser({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      systemRole: user.systemRole,
      orgId: user.orgId,
      name: user.name,
    });
  }
}
