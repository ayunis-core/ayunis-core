import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthenticationRepository } from '../../ports/authentication.repository';
import { AUTHENTICATION_REPOSITORY } from '../../tokens/authentication-repository.token';
import { LoginCommand } from './login.command';
import { AuthTokens } from '../../../domain/auth-tokens.entity';

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authRepository: AuthenticationRepository,
  ) {}

  async execute(command: LoginCommand): Promise<AuthTokens> {
    this.logger.log('login', {
      userId: command.user.id,
      email: command.user.email,
    });
    return this.authRepository.generateTokens(command.user);
  }
}
