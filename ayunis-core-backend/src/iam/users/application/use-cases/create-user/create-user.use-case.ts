import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { CreateUserCommand } from './create-user.command';
import { User } from '../../../domain/user.entity';
import { HashTextUseCase } from '../../../../hashing/application/use-cases/hash-text/hash-text.use-case';
import { HashTextCommand } from '../../../../hashing/application/use-cases/hash-text/hash-text.command';
import {
  UserAlreadyExistsError,
  UserInvalidInputError,
  UserError,
  UserEmailProviderBlacklistedError,
} from '../../users.errors';
import { HashingError } from '../../../../hashing/application/hashing.errors';
import { UserCreatedWebhookEvent } from 'src/common/webhooks/domain/webhook-events/user-created.webhook-event';
import { SendWebhookCommand } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly hashTextUseCase: HashTextUseCase,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    this.logger.log('createUser', {
      email: command.email,
      orgId: command.orgId,
      role: command.role,
      name: command.name,
      hasAcceptedMarketing: command.hasAcceptedMarketing,
    });

    const emailProvider = command.email.split('@')[1];
    const emailProviderBlacklist = this.configService.get<string[]>(
      'auth.emailProviderBlacklist',
    )!;
    if (emailProviderBlacklist.includes(emailProvider)) {
      throw new UserEmailProviderBlacklistedError(emailProvider);
    }

    try {
      this.logger.debug('Checking if user already exists');
      const existingUser = await this.usersRepository.findOneByEmail(
        command.email,
      );

      if (existingUser) {
        this.logger.warn('User already exists', { email: command.email });
        throw new UserAlreadyExistsError('User already exists');
      }

      this.logger.debug('Hashing password');
      let passwordHash: string;
      try {
        passwordHash = await this.hashTextUseCase.execute(
          new HashTextCommand(command.password),
        );
      } catch (error) {
        if (error instanceof HashingError) {
          // Already logged in hashing use case
          throw error;
        }
        this.logger.error('Password hashing failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: command.email,
        });
        throw new UserInvalidInputError('Password hashing failed');
      }

      this.logger.debug('Creating new user');
      const user = new User({
        email: command.email,
        emailVerified: command.emailVerified,
        passwordHash,
        orgId: command.orgId,
        role: command.role,
        name: command.name,
        hasAcceptedMarketing: command.hasAcceptedMarketing,
      });

      const createdUser = await this.usersRepository.create(user);
      this.logger.debug('User created successfully', {
        userId: createdUser.id,
        role: command.role,
      });

      // Send webhook asynchronously (don't block the main operation)
      void this.sendWebhookUseCase.execute(
        new SendWebhookCommand(
          new UserCreatedWebhookEvent({
            user: createdUser,
            orgId: command.orgId,
          }),
        ),
      );

      return createdUser;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('User creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: command.email,
        role: command.role,
      });
      throw new UserInvalidInputError('User creation failed');
    }
  }
}
