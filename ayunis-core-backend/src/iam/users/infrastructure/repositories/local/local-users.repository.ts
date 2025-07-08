import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { User } from 'src/iam/users/domain/user.entity';
import { UUID } from 'crypto';
import { Repository } from 'typeorm';
import { UserRecord } from './schema/user.record';
import { InjectRepository } from '@nestjs/typeorm';
import { UserMapper } from './mappers/user.mapper';
import {
  UserNotFoundError,
  UserAlreadyExistsError,
  UserInvalidInputError,
  UserAuthenticationFailedError,
} from 'src/iam/users/application/users.errors';

@Injectable()
export class LocalUsersRepository extends UsersRepository {
  private readonly logger = new Logger(LocalUsersRepository.name);

  constructor(
    @InjectRepository(UserRecord)
    private readonly userRepository: Repository<UserRecord>,
  ) {
    super();
    this.logger.log('constructor');
  }

  async findOneById(id: UUID): Promise<User | null> {
    this.logger.log('findOneById', { id });
    try {
      const userEntity = await this.userRepository.findOne({ where: { id } });
      if (!userEntity) {
        this.logger.warn('User not found by ID', { id });
        return null;
      }
      return UserMapper.toDomain(userEntity);
    } catch (error) {
      this.logger.error('Failed to find user by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
      });
      throw new UserInvalidInputError(`Error finding user with ID ${id}`);
    }
  }

  async findOneByEmail(email: string): Promise<User | null> {
    this.logger.log('findOneByEmail', { email });
    try {
      const userEntity = await this.userRepository.findOne({
        where: { email },
      });
      if (!userEntity) {
        this.logger.debug('User not found by email', { email });
        return null;
      }
      return UserMapper.toDomain(userEntity);
    } catch (error) {
      this.logger.error('Failed to find user by email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw new UserInvalidInputError(`Error finding user with email ${email}`);
    }
  }

  async findOneByOrgId(orgId: UUID): Promise<User[]> {
    this.logger.log('findOneByOrgId', { orgId });
    try {
      const userEntities = await this.userRepository.find({ where: { orgId } });
      return userEntities.map((userEntity) => UserMapper.toDomain(userEntity));
    } catch (error) {
      this.logger.error('Failed to find users by organization ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId,
      });
      throw new UserInvalidInputError(
        `Error finding users for organization ${orgId}`,
      );
    }
  }

  async findManyByOrgId(orgId: UUID): Promise<User[]> {
    this.logger.log('findManyByOrgId', { orgId });
    const userEntities = await this.userRepository.find({
      where: { orgId },
    });
    return userEntities.map((userEntity) => UserMapper.toDomain(userEntity));
  }

  async create(user: User): Promise<User> {
    this.logger.log('create', { userId: user.id, email: user.email });
    try {
      // Check if user already exists by email
      const existingUser = await this.userRepository.findOne({
        where: { email: user.email },
      });

      if (existingUser) {
        this.logger.warn('Attempted to create user with existing email', {
          email: user.email,
        });
        throw new UserAlreadyExistsError(
          `User with email ${user.email} already exists`,
        );
      }

      const userEntity = UserMapper.toEntity(user);
      const savedUserEntity = await this.userRepository.save(userEntity);
      this.logger.debug('User created successfully', {
        userId: savedUserEntity.id,
      });
      return UserMapper.toDomain(savedUserEntity);
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw error;
      }
      this.logger.error('Failed to create user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: user.email,
      });
      throw new UserInvalidInputError('Failed to create user');
    }
  }

  async update(user: User): Promise<User> {
    this.logger.log('update', { userId: user.id });
    try {
      // Verify user exists
      const existingUser = await this.userRepository.findOne({
        where: { id: user.id },
      });

      if (!existingUser) {
        this.logger.warn('Attempted to update non-existent user', {
          userId: user.id,
        });
        throw new UserNotFoundError(`User with ID ${user.id} not found`);
      }

      const userEntity = UserMapper.toEntity(user);
      const savedUserEntity = await this.userRepository.save(userEntity);
      this.logger.debug('User updated successfully', {
        user: savedUserEntity,
      });
      return UserMapper.toDomain(savedUserEntity);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      this.logger.error('Failed to update user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
      });
      throw new UserInvalidInputError(
        `Failed to update user with ID ${user.id}`,
      );
    }
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });
    try {
      // Verify user exists
      const existingUser = await this.userRepository.findOne({ where: { id } });

      if (!existingUser) {
        this.logger.warn('Attempted to delete non-existent user', {
          userId: id,
        });
        throw new UserNotFoundError(`User with ID ${id} not found`);
      }

      await this.userRepository.delete(id);
      this.logger.debug('User deleted successfully', { userId: id });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      this.logger.error('Failed to delete user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: id,
      });
      throw new UserInvalidInputError(`Failed to delete user with ID ${id}`);
    }
  }

  async validateUser(email: string, password: string): Promise<User> {
    this.logger.log('validateUser', { email });

    const user = await this.findOneByEmail(email);
    if (!user) {
      this.logger.warn('User not found during validation', { email });
      throw new UserNotFoundError(`User with email ${email} not found`);
    }

    // In a real implementation, this would validate the password hash
    if (password !== 'admin') {
      // This is a placeholder validation
      this.logger.warn('Invalid password during validation', { email });
      throw new UserAuthenticationFailedError('Invalid password');
    }

    return user;
  }

  async isValidPassword(password: string): Promise<boolean> {
    if (password.length < 8) {
      return Promise.resolve(false);
    }
    if (!/[A-Z]/.test(password)) {
      return Promise.resolve(false);
    }
    if (!/[0-9]/.test(password)) {
      return Promise.resolve(false);
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return Promise.resolve(false);
    }
    if (!/[a-z]/.test(password)) {
      return Promise.resolve(false);
    }
    return Promise.resolve(true);
  }
}
