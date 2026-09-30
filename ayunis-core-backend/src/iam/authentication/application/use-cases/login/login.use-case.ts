import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthenticationRepository } from 'src/iam/authentication/application/ports/authentication.repository';
import { AUTHENTICATION_REPOSITORY } from 'src/iam/authentication/application/tokens/authentication-repository.token';
import { LoginCommand } from 'src/iam/authentication/application/use-cases/login/login.command';
import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { UnexpectedAuthenticationError } from 'src/iam/authentication/application/authentication.errors';
import { CreateSessionUseCase } from 'src/iam/sessions/application/use-cases/create-session/create-session.use-case';
import { CreateSessionCommand } from 'src/iam/sessions/application/use-cases/create-session/create-session.command';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AuthorizeUserLoginCommand } from 'src/iam/users/application/use-cases/authorize-user-login/authorize-user-login.command';
import { AuthorizeUserLoginUseCase } from 'src/iam/users/application/use-cases/authorize-user-login/authorize-user-login.use-case';
import { LocalPasswordLoginPolicyService } from 'src/iam/authentication/application/services/local-password-login-policy.service';
import { Transactional } from '@nestjs-cls/transactional';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authRepository: AuthenticationRepository,
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly authorizeUserLoginUseCase: AuthorizeUserLoginUseCase,
    private readonly localPasswordLoginPolicy: LocalPasswordLoginPolicyService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAuthenticationError)
  @Transactional()
  async execute(command: LoginCommand): Promise<AuthTokens> {
    this.logger.log(
      {
        userId: command.user.id,
        email: command.user.email,
      },
      'login',
    );
    const user = await this.authorizeUserLoginUseCase.execute(
      new AuthorizeUserLoginCommand(command.user.id),
    );
    await this.localPasswordLoginPolicy.assertSessionIssuanceAllowed(
      user.orgId,
      command.authenticationMethod,
    );
    const session = await this.createSessionUseCase.execute(
      new CreateSessionCommand(
        user.id,
        command.authenticationMethod,
        command.zitadelSessionId,
      ),
    );
    const accessToken = await this.authRepository.generateAccessToken(
      this.toActiveUser(user),
    );
    return new AuthTokens(accessToken, session.refreshToken);
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
