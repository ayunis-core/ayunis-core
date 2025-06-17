import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ValidateUserUseCase } from '../../../users/application/use-cases/validate-user/validate-user.use-case';
import { ValidateUserQuery } from '../../../users/application/use-cases/validate-user/validate-user.query';
import { Strategy } from 'passport-local';
import { ActiveUser } from '../../domain/active-user.entity';
import {
  UserAuthenticationFailedError,
  UserNotFoundError,
} from 'src/iam/users/application/users.errors';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private validateUserUseCase: ValidateUserUseCase) {
    super({ usernameField: 'email' });
  }

  async validate(username: string, password: string) {
    try {
      const user = await this.validateUserUseCase.execute(
        new ValidateUserQuery(username, password),
      );
      return new ActiveUser(
        user.id,
        user.email,
        user.role,
        user.orgId,
        user.name,
      );
    } catch (error) {
      if (
        error instanceof UserNotFoundError ||
        error instanceof UserAuthenticationFailedError
      ) {
        this.logger.warn('Invalid credentials', {
          error,
          username,
        });
        return null;
      }
      throw error;
    }
  }
}
