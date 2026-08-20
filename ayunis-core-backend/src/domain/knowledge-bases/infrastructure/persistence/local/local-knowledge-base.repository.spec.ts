import type { UUID } from 'crypto';
import type { Repository } from 'typeorm';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { KnowledgeBaseMapper } from './mappers/knowledge-base.mapper';
import type { KnowledgeBaseRecord } from './schema/knowledge-base.record';
import type { SourceMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source.mapper';
import type { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { LocalKnowledgeBaseRepository } from './local-knowledge-base.repository';

describe('LocalKnowledgeBaseRepository', () => {
  const firstKnowledgeBaseId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
  const secondKnowledgeBaseId = '650e8400-e29b-41d4-a716-446655440001' as UUID;

  it('returns a database-paginated page of accessible knowledge bases', async () => {
    const userId = '750e8400-e29b-41d4-a716-446655440002' as UUID;
    const workspaceId = '850e8400-e29b-41d4-a716-446655440003' as UUID;
    const records = [
      { id: firstKnowledgeBaseId, name: 'Citizen requests' },
      { id: secondKnowledgeBaseId, name: 'Budget planning' },
    ] as KnowledgeBaseRecord[];
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([records, 9]),
    };
    const knowledgeBaseRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<KnowledgeBaseRecord>>;
    const mapper = {
      toDomain: jest.fn((record: KnowledgeBaseRecord) => record),
    } as unknown as KnowledgeBaseMapper;
    const repository = new LocalKnowledgeBaseRepository(
      createPinoLoggerMock(),
      knowledgeBaseRepository,
      {} as Repository<SourceRecord>,
      mapper,
      {} as SourceMapper,
    );

    const result = await repository.findPaginatedAccessible(
      userId,
      workspaceId,
      [secondKnowledgeBaseId],
      {
        search: 'citizen',
        limit: 2,
        offset: 4,
      },
    );

    expect(result.data).toEqual(records);
    expect(result.total).toBe(9);
    expect(result.limit).toBe(2);
    expect(result.offset).toBe(4);
    expect(queryBuilder.skip).toHaveBeenCalledWith(4);
    expect(queryBuilder.take).toHaveBeenCalledWith(2);
    expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(1);
  });

  it('returns grouped source counts and zeroes for knowledge bases without sources', async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([
          { knowledgeBaseId: firstKnowledgeBaseId, count: '3' },
        ]),
    };
    const sourceRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<
      Pick<Repository<SourceRecord>, 'createQueryBuilder'>
    >;
    const repository = new LocalKnowledgeBaseRepository(
      createPinoLoggerMock(),
      {} as Repository<KnowledgeBaseRecord>,
      sourceRepository as unknown as Repository<SourceRecord>,
      {} as KnowledgeBaseMapper,
      {} as SourceMapper,
    );

    const result = await repository.countSourcesByKnowledgeBaseIds([
      firstKnowledgeBaseId,
      secondKnowledgeBaseId,
    ]);

    expect(result).toEqual(
      new Map<UUID, number>([
        [firstKnowledgeBaseId, 3],
        [secondKnowledgeBaseId, 0],
      ]),
    );
    expect(sourceRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'source.knowledgeBaseId IN (:...knowledgeBaseIds)',
      { knowledgeBaseIds: [firstKnowledgeBaseId, secondKnowledgeBaseId] },
    );
  });

  it('does not query when no knowledge base ids are provided', async () => {
    const sourceRepository = {
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<Repository<SourceRecord>, 'createQueryBuilder'>
    >;
    const repository = new LocalKnowledgeBaseRepository(
      createPinoLoggerMock(),
      {} as Repository<KnowledgeBaseRecord>,
      sourceRepository as unknown as Repository<SourceRecord>,
      {} as KnowledgeBaseMapper,
      {} as SourceMapper,
    );

    const result = await repository.countSourcesByKnowledgeBaseIds([]);

    expect(result).toEqual(new Map());
    expect(sourceRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
