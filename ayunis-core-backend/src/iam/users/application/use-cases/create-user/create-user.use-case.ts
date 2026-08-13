import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from 'src/common/errors/base.error';
import { HashingError } from 'src/iam/hashing/application/hashing.errors';
import { HashTextCommand } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.command';
import { HashTextUseCase } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.use-case';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { CreateUserCommand } from 'src/iam/users/application/use-cases/create-user/create-user.command';
import { PublishUserCreatedEventUseCase } from 'src/iam/users/application/use-cases/publish-user-created-event/publish-user-created-event.use-case';
import {
  UserAlreadyExistsError,
  UserEmailProviderBlacklistedError,
  UserInvalidInputError,
} from 'src/iam/users/application/users.errors';
import { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly hashTextUseCase: HashTextUseCase,
    private readonly configService: ConfigService,
    private readonly publishUserCreated: PublishUserCreatedEventUseCase,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    const user = await this.createWithoutPublishing(command);
    this.publishUserCreated.execute(user);
    return user;
  }

  async createWithoutPublishing(command: CreateUserCommand): Promise<User> {
    const user = await this.prepare(command);
    return this.createPreparedWithoutPublishing(user);
  }

  async prepare(command: CreateUserCommand): Promise<User> {
    this.logger.log('createUser', {
      email: command.email,
      orgId: command.orgId,
      role: command.role,
      name: command.name,
      hasAcceptedMarketing: command.hasAcceptedMarketing,
    });

    this.assertEmailProviderAllowed(command.email);

    try {
      await this.assertUserDoesNotExist(command.email);
      const passwordHash = await this.hashPassword(command);
      return new User({
        email: command.email,
        emailVerified: command.emailVerified,
        passwordHash,
        orgId: command.orgId,
        role: command.role,
        name: command.name,
        hasAcceptedMarketing: command.hasAcceptedMarketing,
        department: command.department,
      });
    } catch (error) {
      this.throwCreationError(error, command.email, command.role);
    }
  }

  async createPreparedWithoutPublishing(user: User): Promise<User> {
    try {
      return await this.persistUser(user);
    } catch (error) {
      this.throwCreationError(error, user.email, user.role);
    }
  }

  private assertEmailProviderAllowed(email: string): void {
    const emailProvider = email.split('@')[1];
    const blacklist = this.configService.get<string[]>(
      'auth.emailProviderBlacklist',
    )!;
    if (blacklist.includes(emailProvider)) {
      throw new UserEmailProviderBlacklistedError(emailProvider);
    }
  }

  private async assertUserDoesNotExist(email: string): Promise<void> {
    this.logger.debug('Checking if user already exists');
    if (await this.usersRepository.findOneByEmail(email)) {
      this.logger.warn('User already exists', { email });
      throw new UserAlreadyExistsError('User already exists');
    }
  }

  private async hashPassword(command: CreateUserCommand): Promise<string> {
    this.logger.debug('Hashing password');
    try {
      return await this.hashTextUseCase.execute(
        new HashTextCommand(command.password),
      );
    } catch (error) {
      if (error instanceof HashingError) throw error;
      this.logger.error('Password hashing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: command.email,
      });
      throw new UserInvalidInputError('Password hashing failed');
    }
  }

  private async persistUser(user: User): Promise<User> {
    this.logger.debug('Creating new user');
    const createdUser = await this.usersRepository.create(user);
    this.logger.debug('User created successfully', {
      userId: createdUser.id,
      role: user.role,
    });
    return createdUser;
  }

  private throwCreationError(
    error: unknown,
    email: string,
    role: User['role'],
  ): never {
    if (error instanceof ApplicationError) throw error;
    this.logger.error('User creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email,
      role,
    });
    throw new UserInvalidInputError('User creation failed');
  }
}
