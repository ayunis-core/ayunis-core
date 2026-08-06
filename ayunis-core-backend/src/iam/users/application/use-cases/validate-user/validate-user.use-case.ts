import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { ValidateUserQuery } from './validate-user.query';
import { User } from 'src/iam/users/domain/user.entity';
import { CompareHashUseCase } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.use-case';
import { CompareHashCommand } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.command';
import {
  UserNotFoundError,
  UserAuthenticationFailedError,
  UserUnexpectedError,
} from '../../users.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class ValidateUserUseCase {
  private readonly logger = new Logger(ValidateUserUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly compareHashUseCase: CompareHashUseCase,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(query: ValidateUserQuery): Promise<User> {
    this.logger.log('validateUser', { email: query.email });

    const user = await this.usersRepository.findOneByEmail(query.email);
    if (!user) {
      this.logger.warn('User not found during validation', {
        email: query.email,
      });
      throw new UserNotFoundError('unknown');
    }
    if (user.passwordHash === null) {
      throw new UserAuthenticationFailedError(
        'Local password authentication is unavailable',
      );
    }

    this.logger.debug('Validating password', { userId: user.id });
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
  }
}
