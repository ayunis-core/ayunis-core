import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { ValidateUserQuery } from './validate-user.query';
import { User } from '../../../domain/user.entity';
import { CompareHashUseCase } from '../../../../hashing/application/use-cases/compare-hash/compare-hash.use-case';
import { CompareHashCommand } from '../../../../hashing/application/use-cases/compare-hash/compare-hash.command';
import {
  UserNotFoundError,
  UserAuthenticationFailedError,
  UserError,
} from '../../users.errors';
import { HashingError } from '../../../../hashing/application/hashing.errors';

@Injectable()
export class ValidateUserUseCase {
  private readonly logger = new Logger(ValidateUserUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly compareHashUseCase: CompareHashUseCase,
  ) {}

  async execute(query: ValidateUserQuery): Promise<User> {
    this.logger.log('validateUser', { email: query.email });

    try {
      const user = await this.usersRepository.findOneByEmail(query.email);
      if (!user) {
        this.logger.warn('User not found during validation', {
          email: query.email,
        });
        throw new UserNotFoundError('User not found');
      }

      this.logger.debug('Validating password', { userId: user.id });

      try {
        const isPasswordValid = await this.compareHashUseCase.execute(
          new CompareHashCommand(query.password, user.passwordHash),
        );

        if (!isPasswordValid) {
          this.logger.warn('Invalid password during validation', {
            email: query.email,
          });
          throw new UserAuthenticationFailedError('Invalid password');
        }

        this.logger.debug('User validated successfully', { userId: user.id });
        return user;
      } catch (error) {
        if (error instanceof UserError || error instanceof HashingError) {
          throw error;
        }
        this.logger.error('Password validation failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: query.email,
        });
        throw new UserAuthenticationFailedError('Password validation failed');
      }
    } catch (error) {
      if (error instanceof UserError) {
        throw error;
      }
      this.logger.error('User validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: query.email,
      });
      throw new UserAuthenticationFailedError('User validation failed');
    }
  }
}
