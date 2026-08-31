import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { LocalUsersRepository } from 'src/iam/users/infrastructure/repositories/local/local-users.repository';
import { UserMapper } from 'src/iam/users/infrastructure/repositories/local/mappers/user.mapper';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { FindOperator } from 'typeorm';

describe(LocalUsersRepository.name, () => {
  it('uses exact case-insensitive equality for emails containing SQL wildcards', async () => {
    const records = { findOne: jest.fn().mockResolvedValue(null) };
    const repository = new LocalUsersRepository(createPinoLoggerMock(), {
      tx: { getRepository: jest.fn().mockReturnValue(records) },
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>);

    await repository.findOneByEmail('  Anna_Schmidt%@Example.com  ');

    const where = records.findOne.mock.calls[0][0].where as {
      email: FindOperator<string>;
    };
    expect(where.email.type).toBe('raw');
    expect(where.email.objectLiteralParameters).toEqual({
      normalizedEmail: 'anna_schmidt%@example.com',
    });
    expect(where.email.getSql?.('user.email')).toBe(
      'LOWER(user.email) = :normalizedEmail',
    );
  });

  it('translates a concurrent email insert into the user conflict contract', async () => {
    const records = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockRejectedValue({
        code: '23505',
        constraint: 'UQ_97672ac88f789774dd47f7c8be3',
      }),
    };
    const repository = new LocalUsersRepository(createPinoLoggerMock(), {
      tx: { getRepository: jest.fn().mockReturnValue(records) },
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>);

    await expect(repository.create(aUser())).rejects.toMatchObject({
      code: 'USER_ALREADY_EXISTS',
    });
  });

  it('returns database-owned lock state from the atomic update', async () => {
    const user = aUser();
    const lockedAt = new Date('2026-08-24T10:00:00.000Z');
    const persistedUser = Object.assign(UserMapper.toEntity(user), {
      lockedAt,
    });
    const builder = createUpdateBuilder({ raw: [persistedUser] });
    const repository = createRepository({
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    });

    const updatedUser = await repository.update(user);

    expect(updatedUser.lockedAt).toEqual(lockedAt);
    expect(builder.returning).toHaveBeenCalledWith('*');
    expect(builder.execute).toHaveBeenCalledTimes(1);
  });

  it('does not recreate a user deleted concurrently during update', async () => {
    const user = aUser();
    const builder = createUpdateBuilder({ raw: [] });
    const repository = createRepository({
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    });

    await expect(repository.update(user)).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    });
  });

  it('advances the update timestamp', async () => {
    const user = aUser();
    user.updatedAt = new Date('2026-08-24T10:00:00.000Z');
    const builder = createUpdateBuilder({
      raw: [UserMapper.toEntity(user)],
    });
    const repository = createRepository({
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    });

    await repository.update(user);

    const update = builder.set.mock.calls[0][0] as User;
    expect(update.updatedAt.getTime()).toBeGreaterThan(
      user.updatedAt.getTime(),
    );
  });

  it('atomically starts a new observation window or increments the current one', async () => {
    const builder = createUpdateBuilder({
      raw: [{ failedLoginAttempts: 10 }],
    });
    const repository = createRepository({
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    });
    const userId = randomUUID();
    const attemptedAt = new Date('2026-08-24T10:00:00.000Z');
    const windowStartedAfter = new Date('2026-08-24T09:45:00.000Z');

    const failures = await repository.registerFailedLoginAttempt(
      userId,
      attemptedAt,
      windowStartedAfter,
      10,
    );

    expect(failures).toBe(10);
    const update = builder.set.mock.calls[0][0] as Record<string, () => string>;
    expect(update.failedLoginAttempts()).toContain(
      '"failedLoginWindowStartedAt" < :windowStartedAfter::timestamptz',
    );
    expect(update.lockedAt()).toContain('>= 10');
    expect(builder.execute).toHaveBeenCalledTimes(1);
  });

  it('does not reset failed attempts after a concurrent account lock', async () => {
    const records = { update: jest.fn().mockResolvedValue({ affected: 0 }) };
    const repository = createRepository(records);

    const reset = await repository.resetFailedLoginAttempts(randomUUID());

    expect(reset).toBe(false);
    const criteria = records.update.mock.calls[0][0] as {
      lockedAt: FindOperator<Date>;
    };
    expect(criteria.lockedAt.type).toBe('isNull');
  });

  it('clears all failed-attempt and lock state during administrative recovery', async () => {
    const records = { update: jest.fn().mockResolvedValue({ affected: 1 }) };
    const repository = createRepository(records);

    const cleared = await repository.clearLoginLock(randomUUID());

    expect(cleared).toBe(true);
    expect(records.update.mock.calls[0][1]).toEqual({
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedAt: null,
    });
  });
});

function createRepository(records: object): LocalUsersRepository {
  return new LocalUsersRepository(createPinoLoggerMock(), {
    tx: { getRepository: jest.fn().mockReturnValue(records) },
  } as unknown as TransactionHost<TransactionalAdapterTypeOrm>);
}

function createUpdateBuilder(result: object) {
  const builder = {
    update: jest.fn(),
    set: jest.fn(),
    setParameters: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    returning: jest.fn(),
    execute: jest.fn().mockResolvedValue(result),
  };
  Object.values(builder)
    .filter((value) => jest.isMockFunction(value) && value !== builder.execute)
    .forEach((mock) => mock.mockReturnValue(builder));
  return builder;
}

function aUser(): User {
  return new User({
    email: 'staff@stadt.example',
    emailVerified: true,
    passwordHash: null,
    role: UserRole.USER,
    orgId: randomUUID(),
    name: 'Erika Mustermann',
    hasAcceptedMarketing: false,
  });
}
