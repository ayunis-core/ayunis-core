import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { Repository } from 'typeorm';
import { LocalRefreshTokensRepository } from 'src/iam/sessions/infrastructure/repositories/local/local-refresh-tokens.repository';
import type { RefreshTokenRecord } from 'src/iam/sessions/infrastructure/repositories/local/schema/refresh-token.record';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import { TEST_ORG_ID } from 'src/iam/sso/application/testing/org-sso-connection.fixtures';
import { RefreshToken } from 'src/iam/sessions/domain/refresh-token.entity';

describe(LocalRefreshTokensRepository.name, () => {
  it('inserts through the ambient transaction', async () => {
    const records = { save: jest.fn().mockResolvedValue(undefined) };
    const txHost = {
      tx: { getRepository: jest.fn().mockReturnValue(records) },
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>;
    const repository = new LocalRefreshTokensRepository(
      {} as Repository<RefreshTokenRecord>,
      txHost,
    );
    const token = new RefreshToken({
      id: '11111111-1111-1111-1111-111111111111',
      tokenHash: 'hash',
      userId: '22222222-2222-2222-2222-222222222222',
      familyId: '33333333-3333-3333-3333-333333333333',
      authenticationMethod: SessionAuthenticationMethod.PASSWORD,
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
      createdAt: new Date('2026-08-31T00:00:00.000Z'),
    });

    await repository.insert(token);

    expect(records.save).toHaveBeenCalledTimes(1);
  });

  it('revokes organization password sessions with one set-based update', async () => {
    const userQuery = chain({
      getQuery: jest.fn().mockReturnValue('SELECT user.id FROM users user'),
    });
    const updateQuery = chain({ execute: jest.fn().mockResolvedValue({}) });
    const records = {
      manager: { createQueryBuilder: jest.fn().mockReturnValue(userQuery) },
      createQueryBuilder: jest.fn().mockReturnValue(updateQuery),
    } as unknown as Repository<RefreshTokenRecord>;
    const txHost = {
      tx: { getRepository: jest.fn().mockReturnValue(records) },
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>;
    const repository = new LocalRefreshTokensRepository(
      {} as Repository<RefreshTokenRecord>,
      txHost,
    );

    await repository.revokePasswordSessionsForOrg(TEST_ORG_ID);

    expect(updateQuery.where).toHaveBeenCalledWith(
      '"userId" IN (SELECT user.id FROM users user)',
      { orgId: TEST_ORG_ID },
    );
    expect(updateQuery.andWhere).toHaveBeenCalledWith(
      'authenticationMethod = :authenticationMethod',
      { authenticationMethod: SessionAuthenticationMethod.PASSWORD },
    );
    expect(updateQuery.andWhere).toHaveBeenCalledWith('revokedAt IS NULL');
    expect(updateQuery.execute).toHaveBeenCalledTimes(1);
  });
});

function chain(overrides: Record<string, jest.Mock> = {}) {
  const query = {
    select: jest.fn(),
    where: jest.fn(),
    update: jest.fn(),
    set: jest.fn(),
    andWhere: jest.fn(),
    execute: jest.fn(),
    ...overrides,
  };
  for (const method of ['select', 'where', 'update', 'set', 'andWhere']) {
    query[method as keyof typeof query].mockReturnValue(query);
  }
  return query;
}
