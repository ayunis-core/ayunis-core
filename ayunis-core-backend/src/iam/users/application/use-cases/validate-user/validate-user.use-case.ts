import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { ValidateUserQuery } from './validate-user.query';
import { User } from 'src/iam/users/domain/user.entity';
import { CompareHashUseCase } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.use-case';
import { CompareHashCommand } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.command';
import {
  UserNotFoundError,
  UserAuthenticationFailedError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';
import {
  DEFAULT_ACCOUNT_LOCKOUT_MAX_ATTEMPTS,
  DEFAULT_ACCOUNT_LOCKOUT_WINDOW_MINUTES,
} from 'src/config/authentication.config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class ValidateUserUseCase {
  constructor(
    @InjectPinoLogger(ValidateUserUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
    private readonly compareHashUseCase: CompareHashUseCase,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(query: ValidateUserQuery): Promise<User> {
    this.logger.info({ email: query.email }, 'validateUser');

    const user = await this.usersRepository.findOneByEmail(query.email);
    if (!user) {
      this.logger.warn(
        {
          email: query.email,
        },
        'User not found during validation',
      );
      throw new UserNotFoundError('unknown');
    }
    this.assertLocalLoginAllowed(user);

    return await this.validatePassword(user, query);
  }

  private async validatePassword(
    user: User,
    query: ValidateUserQuery,
  ): Promise<User> {
    this.logger.debug({ userId: user.id }, 'Validating password');
    const isPasswordValid = await this.compareHashUseCase.execute(
      new CompareHashCommand(query.password, user.passwordHash!),
    );
    if (!isPasswordValid) {
      await this.registerFailedLoginAttempt(user);
      throw new UserAuthenticationFailedError('Invalid password');
    }

    this.logger.debug({ userId: user.id }, 'User validated successfully');
    return user;
  }

  private assertLocalLoginAllowed(user: User): void {
    if (user.lockedAt !== null) {
      throw new UserAuthenticationFailedError('Invalid credentials');
    }
    if (user.passwordHash === null) {
      throw new UserAuthenticationFailedError(
        'Local password authentication is unavailable',
      );
    }
  }

  private async registerFailedLoginAttempt(user: User): Promise<void> {
    const maxAttempts = this.configService.get<number>(
      'auth.accountLockout.maxAttempts',
      DEFAULT_ACCOUNT_LOCKOUT_MAX_ATTEMPTS,
    );
    const windowMinutes = this.configService.get<number>(
      'auth.accountLockout.windowMinutes',
      DEFAULT_ACCOUNT_LOCKOUT_WINDOW_MINUTES,
    );
    const attemptedAt = new Date();
    const windowStartedAfter = new Date(
      attemptedAt.getTime() - windowMinutes * 60 * 1000,
    );
    const failures = await this.usersRepository.registerFailedLoginAttempt(
      user.id,
      attemptedAt,
      windowStartedAfter,
      maxAttempts,
    );
    this.logger.warn(
      {
        userId: user.id,
        failedLoginAttempts: failures,
        accountLocked: failures === null || failures >= maxAttempts,
      },
      'Invalid password during validation',
    );
  }
}
