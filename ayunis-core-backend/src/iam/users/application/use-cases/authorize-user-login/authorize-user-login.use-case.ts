import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import {
  UserAuthenticationFailedError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';
import { AuthorizeUserLoginCommand } from 'src/iam/users/application/use-cases/authorize-user-login/authorize-user-login.command';

@Injectable()
export class AuthorizeUserLoginUseCase {
  constructor(
    @InjectPinoLogger(AuthorizeUserLoginUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: AuthorizeUserLoginCommand): Promise<void> {
    this.logger.info({ userId: command.userId }, 'authorizeUserLogin');
    const user = await this.usersRepository.findOneById(command.userId);
    if (!user) {
      this.rejectLogin(command.userId);
    }
    if (user.lockedAt !== null) {
      this.rejectLogin(command.userId);
    }

    const reset = await this.usersRepository.resetFailedLoginAttempts(
      command.userId,
    );
    if (!reset) {
      this.rejectLogin(command.userId);
    }
    this.logger.info({ userId: command.userId }, 'User login authorized');
  }

  private rejectLogin(userId: AuthorizeUserLoginCommand['userId']): never {
    this.logger.warn({ userId }, 'User login rejected by account state');
    throw new UserAuthenticationFailedError('Invalid credentials');
  }
}
