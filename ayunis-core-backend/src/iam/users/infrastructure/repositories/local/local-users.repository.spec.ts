import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { LocalUsersRepository } from 'src/iam/users/infrastructure/repositories/local/local-users.repository';
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
});

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
