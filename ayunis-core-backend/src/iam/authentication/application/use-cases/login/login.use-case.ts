import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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

@Injectable()
export class LoginUseCase {
  constructor(
    @InjectPinoLogger(LoginUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authRepository: AuthenticationRepository,
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly authorizeUserLoginUseCase: AuthorizeUserLoginUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAuthenticationError)
  async execute(command: LoginCommand): Promise<AuthTokens> {
    this.logger.info(
      {
        userId: command.user.id,
        email: command.user.email,
      },
      'login',
    );
    await this.authorizeUserLoginUseCase.execute(
      new AuthorizeUserLoginCommand(command.user.id),
    );

    const accessToken = await this.authRepository.generateAccessToken(
      command.user,
    );
    const session = await this.createSessionUseCase.execute(
      new CreateSessionCommand(
        command.user.id,
        command.authenticationMethod,
        command.zitadelSessionId,
      ),
    );

    return new AuthTokens(accessToken, session.refreshToken);
  }
}
