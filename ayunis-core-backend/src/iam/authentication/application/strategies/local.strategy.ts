import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PassportStrategy } from '@nestjs/passport';
import { ValidateUserUseCase } from 'src/iam/users/application/use-cases/validate-user/validate-user.use-case';
import { ValidateUserQuery } from 'src/iam/users/application/use-cases/validate-user/validate-user.query';
import { Strategy } from 'passport-local';
import { ActiveUser } from '../../domain/active-user.entity';
import {
  UserAuthenticationFailedError,
  UserNotFoundError,
} from 'src/iam/users/application/users.errors';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectPinoLogger(LocalStrategy.name)
    private readonly logger: PinoLogger,
    private validateUserUseCase: ValidateUserUseCase,
  ) {
    super({ usernameField: 'email' });
  }

  async validate(username: string, password: string) {
    try {
      const user = await this.validateUserUseCase.execute(
        new ValidateUserQuery(username, password),
      );
      this.logger.debug(
        {
          userId: user.id,
        },
        'LocalStrategy - user',
      );
      return new ActiveUser({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        systemRole: user.systemRole,
        orgId: user.orgId,
        name: user.name,
      });
    } catch (error) {
      if (
        error instanceof UserNotFoundError ||
        error instanceof UserAuthenticationFailedError
      ) {
        this.logger.warn(
          {
            err: error as Error,
            email: username,
          },
          'Invalid credentials',
        );
        return null;
      }
      throw error;
    }
  }
}
