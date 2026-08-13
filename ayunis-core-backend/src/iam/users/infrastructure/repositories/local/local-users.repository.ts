import { Injectable, Logger } from '@nestjs/common';
import {
  UsersRepository,
  UsersPagination,
  UsersFilters,
} from 'src/iam/users/application/ports/users.repository';
import type { UserSummary } from 'src/iam/users/domain/user-summary';
import { User } from 'src/iam/users/domain/user.entity';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UUID } from 'crypto';
import { EntityManager, Repository, ILike, In } from 'typeorm';
import { UserRecord } from './schema/user.record';
import { UserMapper } from './mappers/user.mapper';
import {
  UserNotFoundError,
  UserAlreadyExistsError,
} from 'src/iam/users/application/users.errors';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class LocalUsersRepository extends UsersRepository {
  private readonly logger = new Logger(LocalUsersRepository.name);

  constructor(
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
    this.logger.log('constructor');
  }

  // Outside an active transaction txHost.tx resolves to the adapter's fallback
  // instance (dataSource.manager), so this is safe without a null check.
  private getManager(): EntityManager {
    return this.txHost.tx;
  }

  private get users(): Repository<UserRecord> {
    return this.getManager().getRepository(UserRecord);
  }

  async findOneById(id: UUID): Promise<User | null> {
    this.logger.log('findOneById', { id });
    const userEntity = await this.users.findOne({ where: { id } });
    if (!userEntity) {
      this.logger.warn('User not found by ID', { id });
      return null;
    }
    return UserMapper.toDomain(userEntity);
  }

  async findManyByIdsAndOrgId(ids: UUID[], orgId: UUID): Promise<User[]> {
    this.logger.log('findManyByIdsAndOrgId', { idCount: ids.length, orgId });

    if (ids.length === 0) {
      return [];
    }

    const userRecords = await this.users.find({
      where: { id: In(ids), orgId },
    });

    return userRecords.map((record) => UserMapper.toDomain(record));
  }

  async findOneByEmail(email: string): Promise<User | null> {
    this.logger.log('findOneByEmail', { email });
    const userRecord = await this.users.findOne({
      where: { email: ILike(email) },
    });
    if (!userRecord) {
      this.logger.debug('User not found by email', { email });
      return null;
    }
    return UserMapper.toDomain(userRecord);
  }

  async findManyByEmails(emails: string[]): Promise<User[]> {
    this.logger.log('findManyByEmails', { emailCount: emails.length });

    if (emails.length === 0) {
      return [];
    }

    // Convert emails to lowercase for case-insensitive comparison
    const lowerEmails = emails.map((e) => e.toLowerCase());

    const userRecords = await this.users
      .createQueryBuilder('user')
      .where('LOWER(user.email) IN (:...emails)', { emails: lowerEmails })
      .getMany();

    this.logger.debug('Found users by emails', {
      requestedCount: emails.length,
      foundCount: userRecords.length,
    });

    return userRecords.map((record) => UserMapper.toDomain(record));
  }

  async findManyBySystemRole(role: SystemRole): Promise<User[]> {
    this.logger.log('findManyBySystemRole', { role });

    const userRecords = await this.users.find({
      where: { systemRole: role },
      order: { createdAt: 'DESC' },
    });

    return userRecords.map((record) => UserMapper.toDomain(record));
  }

  async findAdminsByOrgId(orgId: UUID): Promise<User[]> {
    this.logger.log('findAdminsByOrgId', { orgId });
    const userRecords = await this.users.find({
      where: { orgId, role: UserRole.ADMIN },
      order: { createdAt: 'DESC' },
    });
    return userRecords.map((record) => UserMapper.toDomain(record));
  }

  async findManyByOrgId(
    orgId: UUID,
    pagination: UsersPagination,
    filters?: UsersFilters,
  ): Promise<Paginated<User>> {
    // The search term is free text over member names and emails, so it is
    // counted rather than logged — it would otherwise persist personal data in
    // centralized logs for their whole retention period.
    this.logger.log('findManyByOrgId', {
      orgId,
      limit: pagination.limit,
      offset: pagination.offset,
      hasSearch: filters?.search !== undefined,
    });

    const queryBuilder = this.users
      .createQueryBuilder('user')
      .where('user.orgId = :orgId', { orgId })
      .orderBy('user.createdAt', 'DESC');

    if (filters?.search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const total = await queryBuilder.getCount();

    queryBuilder.skip(pagination.offset).take(pagination.limit);

    const userRecords = await queryBuilder.getMany();
    const users = userRecords.map((record) => UserMapper.toDomain(record));

    return new Paginated<User>({
      data: users,
      limit: pagination.limit,
      offset: pagination.offset,
      total,
    });
  }

  async findAllIdsByOrgId(orgId: UUID): Promise<UUID[]> {
    this.logger.log('findAllIdsByOrgId', { orgId });
    const users = await this.users.find({
      where: { orgId },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  async findAllSummariesByOrgId(
    orgId: UUID,
    filters?: UsersFilters,
  ): Promise<UserSummary[]> {
    this.logger.log('findAllSummariesByOrgId', {
      orgId,
      hasSearch: filters?.search !== undefined,
    });
    const search = filters?.search?.trim();
    return this.users.find({
      where: search
        ? [
            { orgId, name: ILike(`%${search}%`) },
            { orgId, email: ILike(`%${search}%`) },
          ]
        : { orgId },
      select: { id: true, name: true, email: true },
    });
  }

  async create(user: User): Promise<User> {
    this.logger.log('create', { userId: user.id, email: user.email });
    // Check if user already exists by email (case-insensitive)
    const existingUser = await this.users.findOne({
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
    const savedUserEntity = await this.users.save(userEntity);
    this.logger.debug('User created successfully', {
      userId: savedUserEntity.id,
    });
    return UserMapper.toDomain(savedUserEntity);
  }

  async update(user: User): Promise<User> {
    this.logger.log('update', { userId: user.id });
    // Verify user exists
    const existingUser = await this.users.findOne({
      where: { id: user.id },
    });

    if (!existingUser) {
      this.logger.warn('Attempted to update non-existent user', {
        userId: user.id,
      });
      throw new UserNotFoundError(user.id);
    }

    const userEntity = UserMapper.toEntity(user);
    const savedUserEntity = await this.users.save(userEntity);
    this.logger.debug('User updated successfully', {
      user: savedUserEntity,
    });
    return UserMapper.toDomain(savedUserEntity);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });
    // Verify user exists
    const existingUser = await this.users.findOne({ where: { id } });

    if (!existingUser) {
      this.logger.warn('Attempted to delete non-existent user', {
        userId: id,
      });
      throw new UserNotFoundError(id);
    }

    await this.users.delete(id);
    this.logger.debug('User deleted successfully', { userId: id });
  }

  async isValidPassword(password: string): Promise<boolean> {
    if (password.length < 8) {
      return Promise.resolve(false);
    }
    if (!/[A-Z]/.test(password)) {
      return Promise.resolve(false);
    }
    if (!/\d/.test(password)) {
      return Promise.resolve(false);
    }
    if (!/[a-z]/.test(password)) {
      return Promise.resolve(false);
    }
    return Promise.resolve(true);
  }
}
