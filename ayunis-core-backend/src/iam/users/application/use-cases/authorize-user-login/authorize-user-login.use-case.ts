import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import {
  UserAccountLockedError,
  UserAuthenticationFailedError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';
import { AuthorizeUserLoginCommand } from 'src/iam/users/application/use-cases/authorize-user-login/authorize-user-login.command';

@Injectable()
export class AuthorizeUserLoginUseCase {
  private readonly logger = new Logger(AuthorizeUserLoginUseCase.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: AuthorizeUserLoginCommand): Promise<void> {
    this.logger.log({ userId: command.userId }, 'authorizeUserLogin');
    const user = await this.usersRepository.findOneById(command.userId);
    if (!user) {
      this.rejectLogin(command.userId);
    }
    if (user.lockedAt !== null) {
      this.logger.warn(
        { userId: command.userId },
        'User login rejected because account is locked',
      );
      throw new UserAccountLockedError();
    }

    const reset = await this.usersRepository.resetFailedLoginAttempts(
      command.userId,
    );
    if (!reset) {
      this.rejectLogin(command.userId);
    }
    this.logger.log({ userId: command.userId }, 'User login authorized');
  }

  private rejectLogin(userId: AuthorizeUserLoginCommand['userId']): never {
    this.logger.warn({ userId }, 'User login rejected by account state');
    throw new UserAuthenticationFailedError('Invalid credentials');
  }
}
