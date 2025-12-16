import { Injectable, Logger } from '@nestjs/common';
import {
  UsersRepository,
  FindManyByOrgIdOptions,
} from 'src/iam/users/application/ports/users.repository';
import { User } from 'src/iam/users/domain/user.entity';
import { UUID } from 'crypto';
import { Repository, ILike } from 'typeorm';
import { UserRecord } from './schema/user.record';
import { InjectRepository } from '@nestjs/typeorm';
import { UserMapper } from './mappers/user.mapper';
import {
  UserNotFoundError,
  UserAlreadyExistsError,
  UserAuthenticationFailedError,
} from 'src/iam/users/application/users.errors';
import { Paginated } from 'src/common/pagination';

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
    const userEntity = await this.userRepository.findOne({ where: { id } });
    if (!userEntity) {
      this.logger.warn('User not found by ID', { id });
      return null;
    }
    return UserMapper.toDomain(userEntity);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    this.logger.log('findOneByEmail', { email });
    const userRecord = await this.userRepository.findOne({
      where: { email: ILike(email) },
    });
    if (!userRecord) {
      this.logger.debug('User not found by email', { email });
      return null;
    }
    return UserMapper.toDomain(userRecord);
  }

  async findManyByOrgId(orgId: UUID): Promise<User[]> {
    this.logger.log('findManyByOrgId', { orgId });
    const userEntities = await this.userRepository.find({
      where: { orgId },
    });
    return userEntities.map((userEntity) => UserMapper.toDomain(userEntity));
  }

  async findManyByOrgIdPaginated(
    orgId: UUID,
    options?: FindManyByOrgIdOptions,
  ): Promise<Paginated<User>> {
    this.logger.log('findManyByOrgIdPaginated', { orgId, options });

    const limit = options?.limit ?? 25;
    const offset = options?.offset ?? 0;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.orgId = :orgId', { orgId });

    if (options?.search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    queryBuilder.orderBy('user.createdAt', 'DESC').skip(offset).take(limit);

    const [userEntities, total] = await queryBuilder.getManyAndCount();

    this.logger.debug('Found users by org (paginated)', {
      orgId,
      count: userEntities.length,
      total,
    });

    return new Paginated({
      data: userEntities.map((userEntity) => UserMapper.toDomain(userEntity)),
      limit,
      offset,
      total,
    });
  }

  async create(user: User): Promise<User> {
    this.logger.log('create', { userId: user.id, email: user.email });
    // Check if user already exists by email (case-insensitive)
    const existingUser = await this.userRepository.findOne({
      where: { email: ILike(user.email) },
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
  }

  async update(user: User): Promise<User> {
    this.logger.log('update', { userId: user.id });
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
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });
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
    if (!/[a-z]/.test(password)) {
      return Promise.resolve(false);
    }
    return Promise.resolve(true);
  }
}
