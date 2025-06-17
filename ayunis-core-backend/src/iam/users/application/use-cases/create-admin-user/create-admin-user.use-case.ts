import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from '../../ports/users.repository';
import { CreateAdminUserCommand } from './create-admin-user.command';
import { User } from '../../../domain/user.entity';
import { UserRole } from '../../../domain/value-objects/role.object';
import { HashTextUseCase } from '../../../../hashing/application/use-cases/hash-text/hash-text.use-case';
import { HashTextCommand } from '../../../../hashing/application/use-cases/hash-text/hash-text.command';
import {
  UserAlreadyExistsError,
  UserInvalidInputError,
  UserError,
} from '../../users.errors';
import { HashingError } from '../../../../hashing/application/hashing.errors';

@Injectable()
export class CreateAdminUserUseCase {
  private readonly logger = new Logger(CreateAdminUserUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly hashTextUseCase: HashTextUseCase,
  ) {}

  async execute(command: CreateAdminUserCommand): Promise<User> {
    this.logger.log('createAdmin', {
      email: command.email,
      orgId: command.orgId,
    });
    return this.create(
      command.email,
      command.password,
      command.orgId,
      UserRole.ADMIN,
      command.name,
    );
  }

  private async create(
    email: string,
    password: string,
    orgId: string,
    role: UserRole,
    name: string,
  ): Promise<User> {
    this.logger.log('create', { email, orgId, role, name });

    try {
      this.logger.debug('Checking if user already exists');
      const existingUser = await this.usersRepository.findOneByEmail(email);

      if (existingUser) {
        this.logger.warn('User already exists', { email });
        throw new UserAlreadyExistsError('User already exists');
      }

      this.logger.debug('Hashing password');
      let passwordHash: string;
      try {
        passwordHash = await this.hashTextUseCase.execute(
          new HashTextCommand(password),
        );
      } catch (error) {
        if (error instanceof HashingError) {
          // Already logged in hashing use case
          throw error;
        }
        this.logger.error('Password hashing failed', { error, email });
        throw new UserInvalidInputError('Password hashing failed');
      }

      this.logger.debug('Creating new user');
      const user = new User({
        email,
        passwordHash,
        orgId: orgId as any,
        role,
        name,
      });

      const createdUser = await this.usersRepository.create(user);
      this.logger.debug('User created successfully', {
        userId: createdUser.id,
      });

      return createdUser;
    } catch (error) {
      if (error instanceof UserError || error instanceof HashingError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('User creation failed', { error, email, role });
      throw new UserInvalidInputError('User creation failed');
    }
  }
}
