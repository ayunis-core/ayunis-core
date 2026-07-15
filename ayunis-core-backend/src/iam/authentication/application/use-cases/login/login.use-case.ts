import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthenticationRepository } from '../../ports/authentication.repository';
import { AUTHENTICATION_REPOSITORY } from '../../tokens/authentication-repository.token';
import { LoginCommand } from './login.command';
import { AuthTokens } from '../../../domain/auth-tokens.entity';
import { UnexpectedAuthenticationError } from '../../authentication.errors';
import { CreateSessionUseCase } from 'src/iam/sessions/application/use-cases/create-session/create-session.use-case';
import { CreateSessionCommand } from 'src/iam/sessions/application/use-cases/create-session/create-session.command';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authRepository: AuthenticationRepository,
    private readonly createSessionUseCase: CreateSessionUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAuthenticationError)
  async execute(command: LoginCommand): Promise<AuthTokens> {
    this.logger.log('login', {
      userId: command.user.id,
      email: command.user.email,
    });

    const accessToken = await this.authRepository.generateAccessToken(
      command.user,
    );
    const session = await this.createSessionUseCase.execute(
      new CreateSessionCommand(command.user.id),
    );

    return new AuthTokens(accessToken, session.refreshToken);
  }
}
