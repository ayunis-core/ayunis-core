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
import { EntityManager, Repository, ILike, In, IsNull } from 'typeorm';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { UserMapper } from 'src/iam/users/infrastructure/repositories/local/mappers/user.mapper';
import {
  UserNotFoundError,
  UserAlreadyExistsError,
} from 'src/iam/users/application/users.errors';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { SuperAdminUserListItem } from 'src/iam/users/domain/super-admin-user-list-item';
import { exactEmail } from 'src/common/db/exact-email.operator';

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
    this.logger.log({ id }, 'findOneById');
    const userEntity = await this.users.findOne({ where: { id } });
    if (!userEntity) {
      this.logger.warn({ id }, 'User not found by ID');
      return null;
    }
    return UserMapper.toDomain(userEntity);
  }

  async findManyByIdsAndOrgId(ids: UUID[], orgId: UUID): Promise<User[]> {
    this.logger.log({ idCount: ids.length, orgId }, 'findManyByIdsAndOrgId');

    if (ids.length === 0) {
      return [];
    }

    const userRecords = await this.users.find({
      where: { id: In(ids), orgId },
    });

    return userRecords.map((record) => UserMapper.toDomain(record));
  }

  async findOneByEmail(email: string): Promise<User | null> {
    this.logger.log({ email }, 'findOneByEmail');
    const userRecord = await this.users.findOne({
      where: { email: exactEmail(email) },
    });
    if (!userRecord) {
      this.logger.debug({ email }, 'User not found by email');
      return null;
    }
    return UserMapper.toDomain(userRecord);
  }

  async findManyByEmails(emails: string[]): Promise<User[]> {
    this.logger.log({ emailCount: emails.length }, 'findManyByEmails');

    if (emails.length === 0) {
      return [];
    }

    // Convert emails to lowercase for case-insensitive comparison
    const lowerEmails = emails.map((e) => e.toLowerCase());

    const userRecords = await this.users
      .createQueryBuilder('user')
      .where('LOWER(user.email) IN (:...emails)', { emails: lowerEmails })
      .getMany();

    this.logger.debug(
      {
        requestedCount: emails.length,
        foundCount: userRecords.length,
      },
      'Found users by emails',
    );

    return userRecords.map((record) => UserMapper.toDomain(record));
  }

  async findManyBySystemRole(role: SystemRole): Promise<User[]> {
    this.logger.log({ role }, 'findManyBySystemRole');

    const userRecords = await this.users.find({
      where: { systemRole: role },
      order: { createdAt: 'DESC' },
    });

    return userRecords.map((record) => UserMapper.toDomain(record));
  }

  async findAdminsByOrgId(orgId: UUID): Promise<User[]> {
    this.logger.log({ orgId }, 'findAdminsByOrgId');
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
    this.logger.log(
      {
        orgId,
        limit: pagination.limit,
        offset: pagination.offset,
        hasSearch: filters?.search !== undefined,
      },
      'findManyByOrgId',
    );

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

  async findAllForSuperAdmin(
    pagination: UsersPagination,
    filters?: UsersFilters,
  ): Promise<Paginated<SuperAdminUserListItem>> {
    this.logger.log(
      {
        limit: pagination.limit,
        offset: pagination.offset,
        hasSearch: filters?.search !== undefined,
      },
      'findAllForSuperAdmin',
    );

    const queryBuilder = this.users
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.org', 'org')
      .orderBy('user.createdAt', 'DESC');

    if (filters?.search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const [records, total] = await queryBuilder
      .skip(pagination.offset)
      .take(pagination.limit)
      .getManyAndCount();
    const data = records.map(
      (record) =>
        new SuperAdminUserListItem({
          user: UserMapper.toDomain(record),
          orgName: record.org.name,
        }),
    );

    return new Paginated({
      data,
      limit: pagination.limit,
      offset: pagination.offset,
      total,
    });
  }

  async findAllIdsByOrgId(orgId: UUID): Promise<UUID[]> {
    this.logger.log({ orgId }, 'findAllIdsByOrgId');
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
    this.logger.log(
      {
        orgId,
        hasSearch: filters?.search !== undefined,
      },
      'findAllSummariesByOrgId',
    );
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
    this.logger.log({ userId: user.id, email: user.email }, 'create');
    // Check if user already exists by email (case-insensitive)
    const existingUser = await this.users.findOne({
      where: { email: exactEmail(user.email) },
    });

    if (existingUser) {
      this.logger.warn(
        {
          email: user.email,
        },
        'Attempted to create user with existing email',
      );
      throw new UserAlreadyExistsError(
        `User with email ${user.email} already exists`,
      );
    }

    const userEntity = UserMapper.toEntity(user);
    let savedUserEntity: UserRecord;
    try {
      savedUserEntity = await this.users.save(userEntity);
    } catch (error: unknown) {
      if (isUserEmailUniqueViolation(error)) {
        throw new UserAlreadyExistsError(user.email);
      }
      throw error;
    }
    this.logger.debug(
      { userId: savedUserEntity.id },
      'User created successfully',
    );
    return UserMapper.toDomain(savedUserEntity);
  }

  async update(user: User): Promise<User> {
    this.logger.log({ userId: user.id }, 'update');
    const userEntity = UserMapper.toEntity(user);
    userEntity.updatedAt = new Date();
    const result = await this.users
      .createQueryBuilder()
      .update(UserRecord)
      .set(userEntity)
      .where('id = :userId', { userId: user.id })
      .returning('*')
      .execute();
    const savedUserEntity = (result.raw as UserRecord[]).at(0);
    if (!savedUserEntity) {
      this.logger.warn(
        {
          userId: user.id,
        },
        'Attempted to update non-existent user',
      );
      throw new UserNotFoundError(user.id);
    }
    this.logger.debug(
      {
        userId: savedUserEntity.id,
      },
      'User updated successfully',
    );
    return UserMapper.toDomain(savedUserEntity);
  }

  async registerFailedLoginAttempt(
    userId: UUID,
    attemptedAt: Date,
    windowStartedAfter: Date,
    lockThreshold: number,
  ): Promise<number | null> {
    const threshold = Math.max(1, Math.floor(lockThreshold));
    const windowExpired =
      '("failedLoginWindowStartedAt" IS NULL OR ' +
      '"failedLoginWindowStartedAt" < :windowStartedAfter::timestamptz)';
    const nextAttempts =
      `(CASE WHEN ${windowExpired} THEN 1 ` +
      'ELSE "failedLoginAttempts" + 1 END)';

    const result = await this.users
      .createQueryBuilder()
      .update(UserRecord)
      .set({
        failedLoginAttempts: () => nextAttempts,
        failedLoginWindowStartedAt: () =>
          `(CASE WHEN ${windowExpired} ` +
          'THEN :attemptedAt::timestamptz ' +
          'ELSE "failedLoginWindowStartedAt" END)',
        lockedAt: () =>
          `(CASE WHEN ${nextAttempts} >= ${threshold} ` +
          'THEN :attemptedAt::timestamptz ELSE "lockedAt" END)',
      })
      .setParameters({
        attemptedAt: attemptedAt.toISOString(),
        windowStartedAfter: windowStartedAfter.toISOString(),
      })
      .where('id = :userId', { userId })
      .andWhere('"lockedAt" IS NULL')
      .returning('"failedLoginAttempts"')
      .execute();

    const raw = result.raw as Array<{ failedLoginAttempts?: unknown }>;
    const attempts = raw[0]?.failedLoginAttempts;
    return typeof attempts === 'number' ? attempts : null;
  }

  async resetFailedLoginAttempts(userId: UUID): Promise<boolean> {
    const result = await this.users.update(
      { id: userId, lockedAt: IsNull() },
      { failedLoginAttempts: 0, failedLoginWindowStartedAt: null },
    );
    return result.affected === 1;
  }

  async clearLoginLock(userId: UUID): Promise<boolean> {
    const result = await this.users.update(
      { id: userId },
      {
        failedLoginAttempts: 0,
        failedLoginWindowStartedAt: null,
        lockedAt: null,
      },
    );
    return result.affected === 1;
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log({ id }, 'delete');
    // Verify user exists
    const existingUser = await this.users.findOne({ where: { id } });

    if (!existingUser) {
      this.logger.warn(
        {
          userId: id,
        },
        'Attempted to delete non-existent user',
      );
      throw new UserNotFoundError(id);
    }

    await this.users.delete(id);
    this.logger.debug({ userId: id }, 'User deleted successfully');
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

function isUserEmailUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const value = error as Record<string, unknown>;
  const driver = value.driverError as Record<string, unknown> | undefined;
  return (
    (driver?.code ?? value.code) === '23505' &&
    (driver?.constraint ?? value.constraint) ===
      'UQ_97672ac88f789774dd47f7c8be3'
  );
}
