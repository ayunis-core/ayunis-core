import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedAuthenticationError } from 'src/iam/authentication/application/authentication.errors';
import { LoginCommand } from 'src/iam/authentication/application/use-cases/login/login.command';
import { LoginUseCase } from 'src/iam/authentication/application/use-cases/login/login.use-case';
import { StartAuthenticatedSessionCommand } from 'src/iam/authentication/application/use-cases/start-authenticated-session/start-authenticated-session.command';
import type { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { MfaPendingJwtService } from 'src/iam/authentication/application/services/mfa-pending-jwt.service';
import { CheckMfaLoginRequirementQuery } from 'src/iam/mfa/application/use-cases/check-mfa-login-requirement/check-mfa-login-requirement.query';
import { CheckMfaLoginRequirementUseCase } from 'src/iam/mfa/application/use-cases/check-mfa-login-requirement/check-mfa-login-requirement.use-case';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { AuthorizeUserLoginCommand } from 'src/iam/users/application/use-cases/authorize-user-login/authorize-user-login.command';
import { AuthorizeUserLoginUseCase } from 'src/iam/users/application/use-cases/authorize-user-login/authorize-user-login.use-case';

export type StartAuthenticatedSessionResult =
  | { status: 'authenticated'; tokens: AuthTokens }
  | {
      status: 'mfa_required';
      mfaPendingToken: string;
      enrollmentRequired: boolean;
    };

@Injectable()
export class StartAuthenticatedSessionUseCase {
  private readonly logger = new Logger(StartAuthenticatedSessionUseCase.name);

  constructor(
    private readonly checkMfaLoginRequirement: CheckMfaLoginRequirementUseCase,
    private readonly mfaPendingTokens: MfaPendingJwtService,
    private readonly login: LoginUseCase,
    private readonly authorizeUserLogin: AuthorizeUserLoginUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAuthenticationError)
  async execute(
    command: StartAuthenticatedSessionCommand,
  ): Promise<StartAuthenticatedSessionResult> {
    this.logger.log(
      {
        userId: command.user.id,
        authenticationMethod: command.authenticationMethod,
      },
      'Starting authenticated session',
    );
    const brokerMfaSatisfied =
      command.authenticationMethod === SessionAuthenticationMethod.SSO &&
      command.brokerMfaSatisfied;
    const requirement = brokerMfaSatisfied
      ? 'none'
      : await this.checkMfaLoginRequirement.execute(
          new CheckMfaLoginRequirementQuery(
            command.user.id,
            command.user.orgId,
          ),
        );
    if (requirement === 'none') {
      const tokens = await this.login.execute(
        new LoginCommand(
          command.user,
          command.authenticationMethod,
          command.zitadelSessionId,
        ),
      );
      return { status: 'authenticated', tokens };
    }
    await this.authorizeUserLogin.execute(
      new AuthorizeUserLoginCommand(command.user.id),
    );
    return {
      status: 'mfa_required',
      mfaPendingToken: this.mfaPendingTokens.generate({
        userId: command.user.id,
        enrollmentRequired: requirement === 'enroll',
        authenticationMethod: command.authenticationMethod,
        zitadelSessionId: command.zitadelSessionId,
      }),
      enrollmentRequired: requirement === 'enroll',
    };
  }
}
