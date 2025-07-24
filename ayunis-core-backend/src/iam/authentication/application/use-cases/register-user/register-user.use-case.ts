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
  RegistrationDisabledError,
  UnexpectedAuthenticationError,
} from '../../authentication.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';
import { CreateLegalAcceptanceUseCase } from 'src/iam/legal-acceptances/application/use-cases/create-legal-acceptance/create-legal-acceptance.use-case';
import { CreateTosAcceptanceCommand } from 'src/iam/legal-acceptances/application/use-cases/create-legal-acceptance/create-legal-acceptance.command';
import { ConfigService } from '@nestjs/config';
import { SendConfirmationEmailUseCase } from 'src/iam/users/application/use-cases/send-confirmation-email/send-confirmation-email.use-case';
import { SendConfirmationEmailCommand } from 'src/iam/users/application/use-cases/send-confirmation-email/send-confirmation-email.command';
import { CreateTrialUseCase } from 'src/iam/subscriptions/application/use-cases/create-trial/create-trial.use-case';
import { CreateTrialCommand } from 'src/iam/subscriptions/application/use-cases/create-trial/create-trial.command';
import { FindUserByEmailUseCase } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { FindUserByEmailQuery } from 'src/iam/users/application/use-cases/find-user-by-email/find-user-by-email.query';
import { UserAlreadyExistsError } from 'src/iam/users/application/users.errors';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { SendWebhookCommand } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { OrgCreatedWebhookEvent } from 'src/common/webhooks/domain/webhook-events/org-created.webhook-event';

@Injectable()
export class RegisterUserUseCase {
  private readonly logger = new Logger(RegisterUserUseCase.name);

  constructor(
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    private readonly createAdminUserUseCase: CreateAdminUserUseCase,
    private readonly isValidPasswordUseCase: IsValidPasswordUseCase,
    private readonly createOrgUseCase: CreateOrgUseCase,
    private readonly createLegalAcceptanceUseCase: CreateLegalAcceptanceUseCase,
    private readonly sendConfirmationEmailUseCase: SendConfirmationEmailUseCase,
    private readonly createTrialUseCase: CreateTrialUseCase,
    private readonly configService: ConfigService,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
  ) {}

  async execute(command: RegisterUserCommand): Promise<ActiveUser> {
    this.logger.log('register', {
      email: command.email,
      orgName: command.orgName,
    });

    if (this.configService.get<boolean>('app.disableRegistration')) {
      throw new RegistrationDisabledError();
    }

    try {
      const existingUser = await this.findUserByEmailUseCase.execute(
        new FindUserByEmailQuery(command.email),
      );

      if (existingUser) {
        throw new UserAlreadyExistsError(existingUser.id);
      }

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

      this.logger.debug('Creating trial for organization', { orgId: org.id });
      const trialMaxMessages = this.configService.get<number>(
        'subscriptions.trialMaxMessages',
      )!;
      await this.createTrialUseCase.execute(
        new CreateTrialCommand(org.id, trialMaxMessages),
      );

      const hasEmailConfig =
        this.configService.get<boolean>('emails.hasConfig');
      const disableEmailConfirmation = this.configService.get<boolean>(
        'app.disableEmailConfirmation',
      );
      const shouldConfirmEmail = hasEmailConfig && !disableEmailConfirmation;

      this.logger.debug('Creating admin user', { orgId: org.id });
      const user = await this.createAdminUserUseCase.execute(
        new CreateAdminUserCommand({
          email: command.email,
          password: command.password,
          orgId: org.id,
          name: command.userName,
          emailVerified: shouldConfirmEmail ? false : true,
        }),
      );

      this.logger.debug('Creating legal acceptance', {
        userId: user.id,
        orgId: org.id,
      });
      await this.createLegalAcceptanceUseCase.execute(
        new CreateTosAcceptanceCommand({
          userId: user.id,
          orgId: org.id,
        }),
      );

      if (shouldConfirmEmail) {
        void this.sendConfirmationEmailUseCase.execute(
          new SendConfirmationEmailCommand(user),
        );
      }

      // Send webhook asynchronously (don't block the main operation)
      void this.sendWebhookUseCase.execute(
        new SendWebhookCommand(new OrgCreatedWebhookEvent(org, user)),
      );

      this.logger.debug('Registration successful, logging in user', {
        userId: user.id,
      });

      return new ActiveUser({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        orgId: user.orgId,
        name: user.name,
      });
    } catch (error: unknown) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new UnexpectedAuthenticationError(error);
    }
  }
}
