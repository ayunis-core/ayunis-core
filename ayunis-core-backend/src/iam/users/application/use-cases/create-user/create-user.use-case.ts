import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersRepository } from '../../ports/users.repository';
import { CreateUserCommand } from './create-user.command';
import { User } from '../../../domain/user.entity';
import { HashTextUseCase } from '../../../../hashing/application/use-cases/hash-text/hash-text.use-case';
import { HashTextCommand } from '../../../../hashing/application/use-cases/hash-text/hash-text.command';
import {
  UserAlreadyExistsError,
  UserInvalidInputError,
  UserEmailProviderBlacklistedError,
} from '../../users.errors';
import { HashingError } from '../../../../hashing/application/hashing.errors';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from 'src/common/errors/base.error';
import { UserCreatedEvent } from '../../events/user-created.event';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @InjectPinoLogger(CreateUserUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
    private readonly hashTextUseCase: HashTextUseCase,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    this.logger.info(
      {
        email: command.email,
        orgId: command.orgId,
        role: command.role,
        name: command.name,
        hasAcceptedMarketing: command.hasAcceptedMarketing,
      },
      'createUser',
    );
    this.assertEmailProviderAllowed(command.email);
    try {
      return await this.createUser(command);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: command.email,
          role: command.role,
        },
        'User creation failed',
      );
      throw new UserInvalidInputError('User creation failed');
    }
  }

  private assertEmailProviderAllowed(email: string): void {
    const provider = email.split('@')[1];
    const blacklist = this.configService.get<string[]>(
      'auth.emailProviderBlacklist',
    )!;
    if (blacklist.includes(provider)) {
      throw new UserEmailProviderBlacklistedError(provider);
    }
  }

  private async createUser(command: CreateUserCommand): Promise<User> {
    this.logger.debug('Checking if user already exists');
    const existingUser = await this.usersRepository.findOneByEmail(
      command.email,
    );
    if (existingUser) {
      this.logger.warn({ email: command.email }, 'User already exists');
      throw new UserAlreadyExistsError('User already exists');
    }

    const passwordHash = await this.hashPassword(command);
    this.logger.debug('Creating new user');
    const user = new User({
      email: command.email,
      emailVerified: command.emailVerified,
      passwordHash,
      orgId: command.orgId,
      role: command.role,
      name: command.name,
      hasAcceptedMarketing: command.hasAcceptedMarketing,
      department: command.department,
    });
    const createdUser = await this.usersRepository.create(user);
    this.logger.debug(
      { userId: createdUser.id, role: command.role },
      'User created successfully',
    );
    this.emitUserCreated(createdUser, command);
    return createdUser;
  }

  private async hashPassword(command: CreateUserCommand): Promise<string> {
    this.logger.debug('Hashing password');
    try {
      return await this.hashTextUseCase.execute(
        new HashTextCommand(command.password),
      );
    } catch (error) {
      if (error instanceof HashingError) throw error;
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          email: command.email,
        },
        'Password hashing failed',
      );
      throw new UserInvalidInputError('Password hashing failed');
    }
  }

  private emitUserCreated(user: User, command: CreateUserCommand): void {
    this.eventEmitter
      .emitAsync(
        UserCreatedEvent.EVENT_NAME,
        new UserCreatedEvent(user.id, command.orgId, user),
      )
      .catch((err: unknown) => {
        this.logger.error(
          {
            error: err instanceof Error ? err.message : 'Unknown error',
            userId: user.id,
          },
          'Failed to emit UserCreatedEvent',
        );
      });
  }
}
