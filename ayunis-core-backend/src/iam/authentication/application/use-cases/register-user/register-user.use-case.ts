import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CreateAdminUserUseCase } from 'src/iam/users/application/use-cases/create-admin-user/create-admin-user.use-case';
import { CreateAdminUserCommand } from 'src/iam/users/application/use-cases/create-admin-user/create-admin-user.command';
import { IsValidPasswordUseCase } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.use-case';
import { IsValidPasswordQuery } from 'src/iam/users/application/use-cases/is-valid-password/is-valid-password.query';
import { CreateOrgUseCase } from 'src/iam/orgs/application/use-cases/create-org/create-org.use-case';
import { CreateOrgCommand } from 'src/iam/orgs/application/use-cases/create-org/create-org.command';
import { RegisterUserCommand } from './register-user.command';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import {
  InvalidPasswordError,
  RegistrationDisabledError,
  UnexpectedAuthenticationError,
} from 'src/iam/authentication/application/authentication.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { CreateLegalAcceptanceUseCase } from 'src/iam/legal-acceptances/application/use-cases/create-legal-acceptance/create-legal-acceptance.use-case';
import {
  CreatePrivacyPolicyAcceptanceCommand,
  CreateTosAcceptanceCommand,
} from 'src/iam/legal-acceptances/application/use-cases/create-legal-acceptance/create-legal-acceptance.command';
import { ConfigService } from '@nestjs/config';
import { SendConfirmationEmailUseCase } from 'src/iam/users/application/use-cases/send-confirmation-email/send-confirmation-email.use-case';
import { SendConfirmationEmailCommand } from 'src/iam/users/application/use-cases/send-confirmation-email/send-confirmation-email.command';
import { CreateTrialUseCase } from 'src/iam/trials/application/use-cases/create-trial/create-trial.use-case';
import { CreateTrialCommand } from 'src/iam/trials/application/use-cases/create-trial/create-trial.command';
import { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { FindUserByEmailQuery } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.query';
import { UserAlreadyExistsError } from 'src/iam/users/application/users.errors';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import type { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @InjectPinoLogger(RegisterUserUseCase.name)
    private readonly logger: PinoLogger,
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    private readonly createAdminUserUseCase: CreateAdminUserUseCase,
    private readonly isValidPasswordUseCase: IsValidPasswordUseCase,
    private readonly createOrgUseCase: CreateOrgUseCase,
    private readonly createLegalAcceptanceUseCase: CreateLegalAcceptanceUseCase,
    private readonly sendConfirmationEmailUseCase: SendConfirmationEmailUseCase,
    private readonly createTrialUseCase: CreateTrialUseCase,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<ActiveUser> {
    this.logger.info(
      { email: command.email, org: { name: command.orgName } },
      'register',
    );
    try {
      const { user, shouldConfirmEmail } = await this.register(command);
      if (shouldConfirmEmail) {
        await this.trySendConfirmationEmail(user);
      }
      this.logger.debug(
        { userId: user.id },
        'Registration successful, logging in user',
      );
      return this.toActiveUser(user);
    } catch (error: unknown) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Unexpected authentication error',
      );
      throw new UnexpectedAuthenticationError(error);
    }
  }

  @Transactional()
  private async register(
    command: RegisterUserCommand,
  ): Promise<{ user: User; shouldConfirmEmail: boolean }> {
    await this.assertRegistrationAllowed(command);
    const orgId = await this.createOrganizationWithTrial(command.orgName);
    const shouldConfirmEmail =
      this.configService.get<boolean>('emails.hasConfig');
    const user = await this.createAdminUser(
      command,
      orgId,
      !!shouldConfirmEmail,
    );
    await this.createLegalAcceptances(user.id, orgId);
    return { user, shouldConfirmEmail: !!shouldConfirmEmail };
  }

  private async assertRegistrationAllowed(
    command: RegisterUserCommand,
  ): Promise<void> {
    if (this.configService.get<boolean>('app.disableRegistration')) {
      throw new RegistrationDisabledError();
    }
    const existingUser = await this.findUserByEmailUseCase.execute(
      new FindUserByEmailQuery(command.email),
    );
    if (existingUser) throw new UserAlreadyExistsError(existingUser.id);

    const isValidPassword = await this.isValidPasswordUseCase.execute(
      new IsValidPasswordQuery(command.password),
    );
    if (isValidPassword) return;
    this.logger.warn(
      { email: command.email },
      'Invalid password during registration',
    );
    throw new InvalidPasswordError(
      'Password does not meet security requirements',
    );
  }

  private async createOrganizationWithTrial(orgName: string): Promise<UUID> {
    this.logger.debug('Creating organization');
    const org = await this.createOrgUseCase.execute(
      new CreateOrgCommand(orgName),
    );
    this.logger.debug({ orgId: org.id }, 'Creating trial for organization');
    const maxMessages = this.configService.get<number>(
      'subscriptions.trialMaxMessages',
    )!;
    await this.createTrialUseCase.execute(
      new CreateTrialCommand(org.id, maxMessages),
    );
    return org.id;
  }

  private async createAdminUser(
    command: RegisterUserCommand,
    orgId: UUID,
    shouldConfirmEmail: boolean,
  ): Promise<User> {
    this.logger.debug({ orgId }, 'Creating admin user');
    return this.createAdminUserUseCase.execute(
      new CreateAdminUserCommand({
        email: command.email,
        password: command.password,
        orgId,
        name: command.userName,
        emailVerified: !shouldConfirmEmail,
        hasAcceptedMarketing: command.hasAcceptedMarketing,
        department: command.department,
      }),
    );
  }

  private async createLegalAcceptances(
    userId: UUID,
    orgId: UUID,
  ): Promise<void> {
    this.logger.debug({ userId, orgId }, 'Creating legal acceptance');
    await this.createLegalAcceptanceUseCase.execute(
      new CreateTosAcceptanceCommand({ userId, orgId }),
    );
    await this.createLegalAcceptanceUseCase.execute(
      new CreatePrivacyPolicyAcceptanceCommand({ userId, orgId }),
    );
  }

  private async trySendConfirmationEmail(user: User): Promise<void> {
    try {
      await this.sendConfirmationEmailUseCase.execute(
        new SendConfirmationEmailCommand(user),
      );
    } catch (error: unknown) {
      this.logger.error(
        { err: error as Error, userId: user.id },
        'Failed to send confirmation email after registration',
      );
    }
  }

  private toActiveUser(user: User): ActiveUser {
    return new ActiveUser({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      systemRole: user.systemRole,
      orgId: user.orgId,
      name: user.name,
    });
  }
}
