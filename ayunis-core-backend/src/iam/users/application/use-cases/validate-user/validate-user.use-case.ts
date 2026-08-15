import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UsersRepository } from '../../ports/users.repository';
import { ValidateUserQuery } from './validate-user.query';
import { User } from 'src/iam/users/domain/user.entity';
import { CompareHashUseCase } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.use-case';
import { CompareHashCommand } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.command';
import {
  UserNotFoundError,
  UserAuthenticationFailedError,
  UserError,
} from '../../users.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class ValidateUserUseCase {
  constructor(
    @InjectPinoLogger(ValidateUserUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
    private readonly compareHashUseCase: CompareHashUseCase,
  ) {}

  async execute(query: ValidateUserQuery): Promise<User> {
    this.logger.info({ email: query.email }, 'validateUser');

    try {
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
      if (user.passwordHash === null) {
        throw new UserAuthenticationFailedError(
          'Local password authentication is unavailable',
        );
      }

      return await this.validatePassword(user, query);
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: query.email,
        },
        'User validation failed',
      );
      throw new UserAuthenticationFailedError('User validation failed');
    }
  }

  private async validatePassword(
    user: User,
    query: ValidateUserQuery,
  ): Promise<User> {
    this.logger.debug({ userId: user.id }, 'Validating password');
    try {
      const isPasswordValid = await this.compareHashUseCase.execute(
        new CompareHashCommand(query.password, user.passwordHash!),
      );
      if (!isPasswordValid) {
        this.logger.warn(
          { email: query.email },
          'Invalid password during validation',
        );
        throw new UserAuthenticationFailedError('Invalid password');
      }

      this.logger.debug({ userId: user.id }, 'User validated successfully');
      return user;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: query.email,
        },
        'Password validation failed',
      );
      throw new UserAuthenticationFailedError('Password validation failed');
    }
  }
}
