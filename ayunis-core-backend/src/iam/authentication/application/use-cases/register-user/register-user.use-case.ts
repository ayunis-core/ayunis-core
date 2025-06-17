import { Injectable, Logger } from '@nestjs/common';
import { CreateAdminUserUseCase } from '../../../../users/application/use-cases/create-admin-user/create-admin-user.use-case';
import { CreateAdminUserCommand } from '../../../../users/application/use-cases/create-admin-user/create-admin-user.command';
import { IsValidPasswordUseCase } from '../../../../users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { IsValidPasswordQuery } from '../../../../users/application/use-cases/is-valid-password/is-valid-password.query';
import { CreateOrgUseCase } from '../../../../orgs/application/use-cases/create-org/create-org.use-case';
import { CreateOrgCommand } from '../../../../orgs/application/use-cases/create-org/create-org.command';
import { RegisterUserCommand } from './register-user.command';
import { ActiveUser } from '../../../domain/active-user.entity';
import {
  InvalidPasswordError,
  AuthenticationFailedError,
} from '../../authentication.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';

@Injectable()
export class RegisterUserUseCase {
  private readonly logger = new Logger(RegisterUserUseCase.name);

  constructor(
    private readonly createAdminUserUseCase: CreateAdminUserUseCase,
    private readonly isValidPasswordUseCase: IsValidPasswordUseCase,
    private readonly createOrgUseCase: CreateOrgUseCase,
  ) {}

  async execute(command: RegisterUserCommand): Promise<ActiveUser> {
    this.logger.log('register', {
      email: command.email,
      orgName: command.orgName,
    });

    try {
      const isValidPassword = await this.isValidPasswordUseCase.execute(
        new IsValidPasswordQuery(command.password),
      );

      if (!isValidPassword) {
        this.logger.warn('Invalid password during registration', {
          email: command.email,
        });
        throw new InvalidPasswordError(
          'Password does not meet security requirements',
        );
      }

      this.logger.debug('Creating organization');
      const org = await this.createOrgUseCase.execute(
        new CreateOrgCommand(command.orgName),
      );

      this.logger.debug('Creating admin user', { orgId: org.id });
      const user = await this.createAdminUserUseCase.execute(
        new CreateAdminUserCommand({
          email: command.email,
          password: command.password,
          orgId: org.id,
          name: command.userName,
        }),
      );

      this.logger.debug('Registration successful, logging in user', {
        userId: user.id,
      });

      return new ActiveUser(
        user.id,
        user.email,
        user.role,
        user.orgId,
        user.name,
      );
    } catch (error: unknown) {
      if (!(error instanceof ApplicationError)) {
        this.logger.error('Registration failed', {
          error,
          email: command.email,
        });
        throw new AuthenticationFailedError('Registration failed');
      }

      throw error;
    }
  }
}
