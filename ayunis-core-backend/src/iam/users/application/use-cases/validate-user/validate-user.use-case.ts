import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transactional } from '@nestjs-cls/transactional';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { ValidateUserQuery } from './validate-user.query';
import { User } from 'src/iam/users/domain/user.entity';
import { CompareHashUseCase } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.use-case';
import { CompareHashCommand } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.command';
import {
  UserAccountLockedError,
  UserNotFoundError,
  UserAuthenticationFailedError,
  UserUnexpectedError,
} from 'src/iam/users/application/users.errors';
import {
  DEFAULT_ACCOUNT_LOCKOUT_MAX_ATTEMPTS,
  DEFAULT_ACCOUNT_LOCKOUT_WINDOW_MINUTES,
} from 'src/config/authentication.config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetOrgAuthenticationPolicyQuery } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.query';
import { GetOrgAuthenticationPolicyUseCase } from 'src/iam/sso/application/use-cases/get-org-authentication-policy/get-org-authentication-policy.use-case';

@Injectable()
export class ValidateUserUseCase {
  private readonly logger = new Logger(ValidateUserUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly compareHashUseCase: CompareHashUseCase,
    private readonly configService: ConfigService,
    private readonly getOrgAuthenticationPolicy: GetOrgAuthenticationPolicyUseCase,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(query: ValidateUserQuery): Promise<User> {
    this.logger.log({ email: query.email }, 'validateUser');

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
    await this.assertLocalPasswordLoginEnabled(user);

    return await this.validatePassword(user, query);
  }

  private async assertLocalPasswordLoginEnabled(
    user: User,
    lockForSessionIssuance = false,
  ): Promise<void> {
    const policy = await this.getOrgAuthenticationPolicy.execute(
      new GetOrgAuthenticationPolicyQuery(user.orgId, lockForSessionIssuance),
    );
    if (!policy.localPasswordLoginEnabled) {
      throw new UserAuthenticationFailedError('Invalid credentials');
    }
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
      const accountLocked = await this.registerFailedLoginAttempt(user);
      if (accountLocked) {
        throw new UserAccountLockedError();
      }
      throw new UserAuthenticationFailedError('Invalid password');
    }

    this.logger.debug({ userId: user.id }, 'User validated successfully');
    return user;
  }

  private assertLocalLoginAllowed(user: User): void {
    if (user.lockedAt !== null) {
      throw new UserAccountLockedError();
    }
    if (user.passwordHash === null) {
      throw new UserAuthenticationFailedError(
        'Local password authentication is unavailable',
      );
    }
  }

  @Transactional()
  private async registerFailedLoginAttempt(user: User): Promise<boolean> {
    await this.assertLocalPasswordLoginEnabled(user, true);
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
        accountLocked: failures !== null && failures >= maxAttempts,
      },
      'Invalid password during validation',
    );
    return failures !== null && failures >= maxAttempts;
  }
}
