import type { EntityManager, Repository } from 'typeorm';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';

import { LocalSkillRepository } from './local-skill.repository';
import { LocalSkillAccessiblePageFinder } from './local-skill-accessible-page.finder';
import { LocalSkillKnowledgeBaseIdsFinder } from './local-skill-knowledge-base-ids.finder';
import { SkillRecord } from './schema/skill.record';
import { SkillActivationRecord } from './schema/skill-activation.record';
import type { SkillMapper } from './mappers/skill.mapper';
import { SkillNotActiveError } from 'src/domain/skills/application/skills.errors';

describe('LocalSkillRepository', () => {
  let repository: LocalSkillRepository;
  let skillMapper: jest.Mocked<Pick<SkillMapper, 'toDomain'>>;
  let mockManager: {
    findOne: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
    delete: jest.Mock;
    query: jest.Mock;
    createQueryBuilder: jest.Mock;
    getRepository: jest.Mock;
  };

  const userId = randomUUID();
  const skillId = randomUUID();

  beforeEach(() => {
    const skillRepo = {
      manager: {} as EntityManager,
    } as unknown as jest.Mocked<Repository<SkillRecord>>;

    const mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };

    mockManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      getRepository: jest.fn(),
    };
    mockManager.getRepository.mockReturnValue(mockManager);

    const txHost = {
      tx: mockManager,
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>;

    skillMapper = {
      toDomain: jest.fn(),
    };

    repository = new LocalSkillRepository(
      skillRepo,
      skillMapper as unknown as SkillMapper,
      {} as LocalSkillAccessiblePageFinder,
      new LocalSkillKnowledgeBaseIdsFinder(),
      txHost,
    );
  });

  describe('ambient transaction', () => {
    it('finds a skill with relations written earlier in the transaction', async () => {
      const sourceId = randomUUID();
      const record = {
        id: skillId,
        userId,
        sources: [{ id: sourceId }],
        mcpIntegrations: [],
        knowledgeBases: [],
      } as unknown as SkillRecord;
      const expected = { id: skillId, sourceIds: [sourceId] };
      mockManager.findOne.mockResolvedValue(record);
      skillMapper.toDomain.mockReturnValue(expected as never);

      await expect(repository.findOne(skillId, userId)).resolves.toBe(expected);
      expect(mockManager.getRepository).toHaveBeenCalledWith(SkillRecord);
    });

    it('deletes a skill through the ambient transaction', async () => {
      mockManager.delete.mockResolvedValue({ affected: 1 });

      await expect(repository.delete(skillId, userId)).resolves.toBeUndefined();
    });

    it('reads activation state from the ambient transaction', async () => {
      mockManager.count.mockResolvedValue(1);

      await expect(repository.isSkillActive(skillId, userId)).resolves.toBe(
        true,
      );
      expect(mockManager.getRepository).toHaveBeenCalledWith(
        SkillActivationRecord,
      );
    });
  });

  it('excludes workspace-owned skills from owner lists', async () => {
    mockManager.find.mockResolvedValue([]);

    await repository.findAllByOwner(userId);

    expect(mockManager.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId,
          workspaceId: expect.anything(),
        }),
      }),
    );
  });

  describe('pinSkill', () => {
    it('should set isPinned to true on the activation record', async () => {
      const mockExecute = jest.fn().mockResolvedValue({ affected: 1 });
      mockManager.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: mockExecute,
      });

      await repository.pinSkill(skillId, userId);

      expect(mockManager.createQueryBuilder).toHaveBeenCalled();
    });

    it('should throw SkillNotActiveError when no activation record exists', async () => {
      const mockExecute = jest.fn().mockResolvedValue({ affected: 0 });
      mockManager.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: mockExecute,
      });

      await expect(repository.pinSkill(skillId, userId)).rejects.toThrow(
        SkillNotActiveError,
      );
    });
  });

  it('returns a database-paginated page of accessible skills', async () => {
    const sharedSkillId = randomUUID();
    const workspaceId = randomUUID();
    const records = [
      { id: randomUUID(), name: 'Citizen requests' } as SkillRecord,
      { id: randomUUID(), name: 'Budget planning' } as SkillRecord,
    ];
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([records, 7]),
    };
    const skillRepository = {
      manager: {} as EntityManager,
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<SkillRecord>>;
    const mapper = {
      toDomain: jest.fn((record: SkillRecord) => record),
    } as unknown as SkillMapper;
    const repository = new LocalSkillRepository(
      skillRepository,
      mapper,
      new LocalSkillAccessiblePageFinder(skillRepository),
      new LocalSkillKnowledgeBaseIdsFinder(),
      {
        tx: mockManager,
      } as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
    );

    const result = await repository.findPaginatedAccessible(
      userId,
      workspaceId,
      [sharedSkillId],
      {
        search: 'citizen',
        limit: 2,
        offset: 4,
      },
    );

    expect(result.data).toEqual(records);
    expect(result.total).toBe(7);
    expect(result.limit).toBe(2);
    expect(result.offset).toBe(4);
    expect(queryBuilder.skip).toHaveBeenCalledWith(4);
    expect(queryBuilder.take).toHaveBeenCalledWith(2);
    expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(1);
  });

  it('excludes workspace-owned skills from personal accessible lists', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
    };
    const skillRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<SkillRecord>;
    const finder = new LocalSkillAccessiblePageFinder(skillRepository);

    finder.buildQuery(userId, undefined, [], { limit: 20, offset: 0 });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'skill.workspaceId IS NULL',
    );
  });

  it('returns knowledge-base IDs linked to the supplied skills', async () => {
    const linkedKnowledgeBaseIds = [randomUUID(), randomUUID()];
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(
        linkedKnowledgeBaseIds.map((knowledgeBaseId) => ({
          knowledgeBaseId,
        })),
      ),
    };
    mockManager.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(
      repository.findKnowledgeBaseIdsBySkillIds([skillId]),
    ).resolves.toEqual(linkedKnowledgeBaseIds);
    expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
      'knowledge_bases',
      'knowledgeBase',
      '"knowledgeBase".id = skb."knowledgeBasesId"',
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '"knowledgeBase"."userId" = skill."userId"',
    );
  });

  describe('toggleSkillPinned', () => {
    it('should toggle isPinned and return new value using RETURNING clause', async () => {
      mockManager.query.mockResolvedValue([{ isPinned: true }]);

      const result = await repository.toggleSkillPinned(skillId, userId);

      expect(result).toBe(true);
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE skill_activations'),
        [skillId, userId],
      );
    });

    it('should return false when skill was unpinned', async () => {
      mockManager.query.mockResolvedValue([{ isPinned: false }]);

      const result = await repository.toggleSkillPinned(skillId, userId);

      expect(result).toBe(false);
    });

    it('should throw SkillNotActiveError when no activation row exists', async () => {
      mockManager.query.mockResolvedValue([]);

      await expect(
        repository.toggleSkillPinned(skillId, userId),
      ).rejects.toThrow(SkillNotActiveError);
    });
  });

  describe('isSkillPinned', () => {
    it('should return true when skill is pinned for user', async () => {
      mockManager.count.mockResolvedValue(1);

      const result = await repository.isSkillPinned(skillId, userId);

      expect(result).toBe(true);
      expect(mockManager.count).toHaveBeenCalledWith({
        where: { skillId, userId, isPinned: true },
      });
    });

    it('should return false when skill is not pinned for user', async () => {
      mockManager.count.mockResolvedValue(0);

      const result = await repository.isSkillPinned(skillId, userId);

      expect(result).toBe(false);
    });
  });

  describe('getPinnedSkillIds', () => {
    it('should return only pinned skill IDs', async () => {
      const pinnedSkillId1 = randomUUID();
      const pinnedSkillId2 = randomUUID();
      mockManager.find.mockResolvedValue([
        { skillId: pinnedSkillId1 } as SkillActivationRecord,
        { skillId: pinnedSkillId2 } as SkillActivationRecord,
      ]);

      const result = await repository.getPinnedSkillIds(userId);

      expect(result).toEqual(new Set([pinnedSkillId1, pinnedSkillId2]));
      expect(mockManager.find).toHaveBeenCalledWith({
        where: { userId, isPinned: true },
        select: ['skillId'],
      });
    });

    it('should return an empty set when no skills are pinned', async () => {
      mockManager.find.mockResolvedValue([]);

      const result = await repository.getPinnedSkillIds(userId);

      expect(result).toEqual(new Set());
    });
  });
});
