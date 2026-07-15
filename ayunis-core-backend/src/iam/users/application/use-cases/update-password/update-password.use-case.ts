import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { UsersRepository } from '../../ports/users.repository';
import { UpdatePasswordCommand } from './update-password.command';
import {
  UserInvalidInputError,
  UserNotFoundError,
  UserUnexpectedError,
} from '../../users.errors';
import { HashTextCommand } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.command';
import { HashTextUseCase } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.use-case';
import { ValidateUserUseCase } from '../validate-user/validate-user.use-case';
import { ValidateUserQuery } from '../validate-user/validate-user.query';
import { InvalidPasswordError } from 'src/iam/authentication/application/authentication.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RevokeOtherSessionsForUserUseCase } from 'src/iam/sessions/application/use-cases/revoke-other-sessions-for-user/revoke-other-sessions-for-user.use-case';
import { RevokeOtherSessionsForUserCommand } from 'src/iam/sessions/application/use-cases/revoke-other-sessions-for-user/revoke-other-sessions-for-user.command';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class UpdatePasswordUseCase {
  private readonly logger = new Logger(UpdatePasswordUseCase.name);
  constructor(
    private readonly validateUserUseCase: ValidateUserUseCase,
    private readonly usersRepository: UsersRepository,
    private readonly hashTextUseCase: HashTextUseCase,
    private readonly revokeOtherSessionsForUserUseCase: RevokeOtherSessionsForUserUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(command: UpdatePasswordCommand): Promise<void> {
    this.logger.log('updatePassword', { userId: command.userId });

    if (command.newPassword !== command.newPasswordConfirmation) {
      throw new UserInvalidInputError('Passwords do not match');
    }

    const user = await this.usersRepository.findOneById(command.userId);
    if (!user) {
      throw new UserNotFoundError(command.userId);
    }

    await this.validateUserUseCase.execute(
      new ValidateUserQuery(user.email, command.currentPassword),
    );

    const isValidPassword = await this.usersRepository.isValidPassword(
      command.newPassword,
    );

    if (!isValidPassword) {
      throw new InvalidPasswordError(
        'Password does not meet security requirements',
      );
    }

    user.passwordHash = await this.hashTextUseCase.execute(
      new HashTextCommand(command.newPassword),
    );
    await this.usersRepository.update(user);

    await this.revokeOtherSessions(command.userId);
  }

  /**
   * Logs out every other device; the actor's current session survives. The
   * actor's refresh token is resolved from the request context (populated by
   * UserContextInterceptor); when it is absent (e.g. a legacy cookie) every
   * session is revoked instead.
   */
  private async revokeOtherSessions(userId: UUID): Promise<void> {
    await this.revokeOtherSessionsForUserUseCase.execute(
      new RevokeOtherSessionsForUserCommand(
        userId,
        this.contextService.get('refreshToken'),
      ),
    );
  }
}
