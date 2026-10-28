import type { UUID } from 'crypto';
import { Brackets } from 'typeorm';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { OrgErrorCode } from 'src/iam/orgs/application/orgs.errors';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import { LocalOrgsRepository } from './local-orgs.repository';

describe('LocalOrgsRepository.findById error classification', () => {
  const orgId = '11111111-1111-4111-8111-111111111111' as UUID;
  const records = { findOne: jest.fn() };
  const txHost = {
    tx: { getRepository: () => records },
  } as unknown as TransactionHost<TransactionalAdapterTypeOrm>;
  const repository = new LocalOrgsRepository(txHost);
  const access = new AssertOrgActiveUseCase(repository);

  it.each([
    [false, 'connection failed'],
    [true, 'lock timeout'],
    [true, 'deadlock'],
  ] as const)(
    'reports query failure as a server error (locked: %s, %s)',
    async (lockForLifecycle, reason) => {
      records.findOne.mockRejectedValue(new Error(reason));
      await expect(
        access.execute({ orgId, lockForLifecycle }),
      ).rejects.toMatchObject({
        code: OrgErrorCode.ORG_RETRIEVAL_FAILED,
        statusCode: 500,
      });
    },
  );

  it('still denies access when the organisation does not exist', async () => {
    records.findOne.mockResolvedValue(null);
    await expect(access.execute({ orgId })).rejects.toMatchObject({
      code: OrgErrorCode.ORG_NOT_ACTIVE,
      statusCode: 401,
    });
  });
});

describe('LocalOrgsRepository.findAllForSuperAdmin search', () => {
  const orgId = '22222222-2222-4222-8222-222222222222';

  const runSearch = async (search: string) => {
    const conditions: { sql: string; params?: object }[] = [];
    const where = {
      where: (sql: string, params?: object) => conditions.push({ sql, params }),
      orWhere: (sql: string, params?: object) =>
        conditions.push({ sql: `OR ${sql}`, params }),
    };
    const builder = {
      leftJoinAndSelect: () => builder,
      orderBy: () => builder,
      skip: () => builder,
      take: () => builder,
      getManyAndCount: () => Promise.resolve([[], 0]),
      andWhere: (condition: string | Brackets, params?: object) => {
        if (condition instanceof Brackets)
          condition.whereFactory(where as never);
        else conditions.push({ sql: condition, params });
        return builder;
      },
    };
    const txHost = {
      tx: { getRepository: () => ({ createQueryBuilder: () => builder }) },
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>;
    await new LocalOrgsRepository(txHost).findAllForSuperAdmin(
      { limit: 10, offset: 0 },
      { search },
    );
    return conditions;
  };

  it('matches a pasted organization ID exactly, alongside the name', async () => {
    expect(await runSearch(`  ${orgId}\n`)).toEqual([
      { sql: 'org.name ILIKE :search', params: { search: `%${orgId}%` } },
      { sql: 'OR org.id = :searchId', params: { searchId: orgId } },
    ]);
  });

  it('matches an upper-case organization ID against the stored lower-case ID', async () => {
    const pasted = orgId.toUpperCase().replaceAll('2', 'A');
    expect(await runSearch(pasted)).toContainEqual({
      sql: 'OR org.id = :searchId',
      params: { searchId: pasted.toLowerCase() },
    });
  });

  it('only matches names when the search is not a UUID', async () => {
    expect(await runSearch(' Stadt ')).toEqual([
      { sql: 'org.name ILIKE :search', params: { search: '%Stadt%' } },
    ]);
  });

  it('does not filter on whitespace-only search', async () => {
    expect(await runSearch('   ')).toEqual([]);
  });
});
