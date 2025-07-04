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
} from '../../users.errors';
import { HashingError } from '../../../../hashing/application/hashing.errors';

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly hashTextUseCase: HashTextUseCase,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    this.logger.log('createUser', {
      email: command.email,
      orgId: command.orgId,
      role: command.role,
      name: command.name,
    });

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
          error,
          email: command.email,
        });
        throw new UserInvalidInputError('Password hashing failed');
      }

      this.logger.debug('Creating new user');
      const user = new User({
        email: command.email,
        passwordHash,
        orgId: command.orgId as any,
        role: command.role,
        name: command.name,
      });

      const createdUser = await this.usersRepository.create(user);
      this.logger.debug('User created successfully', {
        userId: createdUser.id,
        role: command.role,
      });

      return createdUser;
    } catch (error) {
      if (error instanceof UserError || error instanceof HashingError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('User creation failed', {
        error,
        email: command.email,
        role: command.role,
      });
      throw new UserInvalidInputError('User creation failed');
    }
  }
}
