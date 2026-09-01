import type { UUID } from 'crypto';
import type { Brackets } from 'typeorm';
import type { Repository } from 'typeorm';
import type { KnowledgeBaseMapper } from './mappers/knowledge-base.mapper';
import type { KnowledgeBaseRecord } from './schema/knowledge-base.record';
import type { SourceMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source.mapper';
import type { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { LocalKnowledgeBaseRepository } from './local-knowledge-base.repository';
import type { KnowledgeBaseActivationRecord } from './schema/knowledge-base-activation.record';

describe('LocalKnowledgeBaseRepository', () => {
  const firstKnowledgeBaseId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
  const secondKnowledgeBaseId = '650e8400-e29b-41d4-a716-446655440001' as UUID;

  it('excludes workspace-owned knowledge bases from owner lists', async () => {
    const userId = '750e8400-e29b-41d4-a716-446655440002' as UUID;
    const find = jest.fn().mockResolvedValue([]);
    const repository = new LocalKnowledgeBaseRepository(
      createPinoLoggerMock(),
      { find } as unknown as Repository<KnowledgeBaseRecord>,
      {} as Repository<SourceRecord>,
      {} as Repository<KnowledgeBaseActivationRecord>,
      { toDomain: jest.fn() } as unknown as KnowledgeBaseMapper,
      {} as SourceMapper,
      { tx: undefined } as never,
    );

    await repository.findAllByUserId(userId);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId,
          workspaceId: expect.anything(),
        }),
      }),
    );
  });

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
      knowledgeBaseRepository,
      {} as Repository<SourceRecord>,
      {} as Repository<KnowledgeBaseActivationRecord>,
      mapper,
      {} as SourceMapper,
      { tx: undefined } as never,
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
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining(
        'assignment."knowledgeBaseId" = "knowledgeBase"."id"',
      ),
      { workspaceId },
    );
    expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(1);
  });

  it('excludes workspace-owned knowledge bases from personal accessible lists', async () => {
    const userId = '750e8400-e29b-41d4-a716-446655440002' as UUID;
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = new LocalKnowledgeBaseRepository(
      createPinoLoggerMock(),
      {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      } as unknown as Repository<KnowledgeBaseRecord>,
      {} as Repository<SourceRecord>,
      {} as Repository<KnowledgeBaseActivationRecord>,
      { toDomain: jest.fn() } as unknown as KnowledgeBaseMapper,
      {} as SourceMapper,
      { tx: undefined } as never,
    );

    await repository.findPaginatedAccessible(userId, undefined, [], {
      limit: 20,
      offset: 0,
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'knowledgeBase.workspaceId IS NULL',
    );
  });

  it('queries only active knowledge bases accessible to the user', async () => {
    const userId = '750e8400-e29b-41d4-a716-446655440002' as UUID;
    const orgId = '850e8400-e29b-41d4-a716-446655440003' as UUID;
    const records = [
      { id: firstKnowledgeBaseId, name: 'Municipal regulations' },
    ] as KnowledgeBaseRecord[];
    const makeSubQuery = (sql: string) => ({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getParameters: jest.fn().mockReturnValue({}),
      getQuery: jest.fn().mockReturnValue(sql),
    });
    const directShareSubQuery = makeSubQuery('(SELECT direct_share)');
    const sharedSkillSubQuery = makeSubQuery('(SELECT shared_skill)');
    const queryBuilder = {
      subQuery: jest
        .fn()
        .mockReturnValueOnce(directShareSubQuery)
        .mockReturnValueOnce(sharedSkillSubQuery),
      escape: jest.fn((name: string) => `"${name}"`),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(records),
    };
    const knowledgeBaseRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<KnowledgeBaseRecord>;
    const mapper = {
      toDomain: jest.fn((record: KnowledgeBaseRecord) => record),
    } as unknown as KnowledgeBaseMapper;
    const repository = new LocalKnowledgeBaseRepository(
      knowledgeBaseRepository,
      {} as Repository<SourceRecord>,
      {} as Repository<KnowledgeBaseActivationRecord>,
      mapper,
      {} as SourceMapper,
      { tx: undefined } as never,
    );

    const result = await repository.findActiveAccessible(userId, orgId);

    expect(result).toEqual(records);
    expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
      expect.any(Function),
      'activation',
      expect.stringContaining('activation.userId = :userId'),
    );
    expect(queryBuilder.setParameters).toHaveBeenCalledWith(
      expect.objectContaining({ userId, orgId }),
    );

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'knowledgeBase.workspaceId IS NULL',
    );
    const accessBrackets = queryBuilder.andWhere.mock.calls[0][0] as Brackets;
    const accessQuery = {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
    };
    accessBrackets.whereFactory(accessQuery as never);
    expect(accessQuery.orWhere).toHaveBeenCalledWith(
      'EXISTS (SELECT direct_share)',
    );
    expect(accessQuery.orWhere).toHaveBeenCalledWith(
      'EXISTS (SELECT shared_skill)',
    );
    expect(sharedSkillSubQuery.innerJoin).toHaveBeenCalledWith(
      'sharedSkill.knowledgeBases',
      'linkedKnowledgeBase',
    );
    expect(sharedSkillSubQuery.andWhere).toHaveBeenCalledWith(
      'sharedSkill.userId = "knowledgeBase"."userId"',
    );
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
      {} as Repository<KnowledgeBaseRecord>,
      sourceRepository as unknown as Repository<SourceRecord>,
      {} as Repository<KnowledgeBaseActivationRecord>,
      {} as KnowledgeBaseMapper,
      {} as SourceMapper,
      { tx: undefined } as never,
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

  it('returns the active knowledge base ids for a user', async () => {
    const userId = '750e8400-e29b-41d4-a716-446655440002' as UUID;
    const activationRepository = {
      find: jest
        .fn()
        .mockResolvedValue([
          { knowledgeBaseId: firstKnowledgeBaseId },
          { knowledgeBaseId: secondKnowledgeBaseId },
        ]),
    } as unknown as Repository<KnowledgeBaseActivationRecord>;
    const repository = new LocalKnowledgeBaseRepository(
      {} as Repository<KnowledgeBaseRecord>,
      {} as Repository<SourceRecord>,
      activationRepository,
      {} as KnowledgeBaseMapper,
      {} as SourceMapper,
      { tx: undefined } as never,
    );

    await expect(repository.getActiveIds(userId)).resolves.toEqual(
      new Set([firstKnowledgeBaseId, secondKnowledgeBaseId]),
    );
  });

  it('does not query when no knowledge base ids are provided', async () => {
    const sourceRepository = {
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<Repository<SourceRecord>, 'createQueryBuilder'>
    >;
    const repository = new LocalKnowledgeBaseRepository(
      {} as Repository<KnowledgeBaseRecord>,
      sourceRepository as unknown as Repository<SourceRecord>,
      {} as Repository<KnowledgeBaseActivationRecord>,
      {} as KnowledgeBaseMapper,
      {} as SourceMapper,
      { tx: undefined } as never,
    );

    const result = await repository.countSourcesByKnowledgeBaseIds([]);

    expect(result).toEqual(new Map());
    expect(sourceRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
