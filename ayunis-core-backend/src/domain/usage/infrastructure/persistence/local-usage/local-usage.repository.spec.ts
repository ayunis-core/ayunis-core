import { randomUUID } from 'crypto';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import type { UUID } from 'crypto';
import type { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import type { UsageMapper } from './mappers/usage.mapper';
import type { UsageQueryMapper } from './mappers/usage-query.mapper';
import type { UsageRecord } from './schema/usage.record';
import { LocalUsageRepository } from './local-usage.repository';

interface QueryBuilderFixture {
  queryBuilder: jest.Mocked<
    Pick<
      SelectQueryBuilder<UsageRecord>,
      | 'select'
      | 'addSelect'
      | 'where'
      | 'andWhere'
      | 'groupBy'
      | 'getRawOne'
      | 'getRawMany'
    >
  >;
  typeOrmRepository: Repository<UsageRecord>;
}

function createQueryBuilderFixture(): QueryBuilderFixture {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };
  const typeOrmRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  } as unknown as Repository<UsageRecord>;

  return { queryBuilder, typeOrmRepository };
}

function createRepository(
  usageRepository: Repository<UsageRecord>,
): LocalUsageRepository {
  return new LocalUsageRepository(
    usageRepository,
    {} as Repository<UserRecord>,
    {} as UsageMapper,
    {} as UsageQueryMapper,
  );
}

describe('LocalUsageRepository', () => {
  it('reports when usage exists for a catalog model', async () => {
    const modelId = randomUUID();
    const usageRepository = {
      existsBy: jest.fn().mockResolvedValue(true),
    } as unknown as Repository<UsageRecord>;
    const repository = createRepository(usageRepository);

    const result = await repository.existsByModelId(modelId);

    expect(result).toBe(true);
    expect(usageRepository.existsBy).toHaveBeenCalledWith({ modelId });
  });

  it('sums monthly credits for one API key within its organization', async () => {
    const { queryBuilder, typeOrmRepository } = createQueryBuilderFixture();
    queryBuilder.getRawOne.mockResolvedValue({ total: '37.25' });
    const repository = createRepository(typeOrmRepository);
    const organizationId = randomUUID();
    const apiKeyId = randomUUID();
    const monthStart = new Date('2026-03-01T00:00:00.000Z');

    const result = await repository.getTotalMonthlyCreditUsageForApiKey(
      organizationId,
      apiKeyId,
      monthStart,
    );

    expect(result).toBe(37.25);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'usage.organizationId = :organizationId',
      { organizationId },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'usage.apiKeyId = :apiKeyId',
      { apiKeyId },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'usage.createdAt >= :monthStart',
      { monthStart },
    );
  });

  it('returns monthly credits grouped by API key in one batched query', async () => {
    const { queryBuilder, typeOrmRepository } = createQueryBuilderFixture();
    const firstApiKeyId = randomUUID();
    const secondApiKeyId = randomUUID();
    queryBuilder.getRawMany.mockResolvedValue([
      { apiKeyId: firstApiKeyId, total: '12.5' },
      { apiKeyId: secondApiKeyId, total: '7' },
    ]);
    const repository = createRepository(typeOrmRepository);
    const organizationId = randomUUID();
    const monthStart = new Date('2026-03-01T00:00:00.000Z');

    const result = await repository.getMonthlyCreditUsagePerApiKey(
      organizationId,
      [firstApiKeyId, secondApiKeyId],
      monthStart,
    );

    expect(result).toEqual(
      new Map<UUID, number>([
        [firstApiKeyId, 12.5],
        [secondApiKeyId, 7],
      ]),
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'usage.apiKeyId IN (:...apiKeyIds)',
      { apiKeyIds: [firstApiKeyId, secondApiKeyId] },
    );
    expect(queryBuilder.groupBy).toHaveBeenCalledWith('usage.apiKeyId');
  });

  it('does not query the database when batched with no API keys', async () => {
    const { typeOrmRepository } = createQueryBuilderFixture();
    const repository = createRepository(typeOrmRepository);

    const result = await repository.getMonthlyCreditUsagePerApiKey(
      randomUUID(),
      [],
      new Date('2026-03-01T00:00:00.000Z'),
    );

    expect(result).toEqual(new Map());
    expect(typeOrmRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
