import type { EntityManager, Repository } from 'typeorm';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID } from 'crypto';

import { LocalSkillRepository } from './local-skill.repository';
import type { SkillRecord } from './schema/skill.record';
import { SkillActivationRecord } from './schema/skill-activation.record';
import type { SkillMapper } from './mappers/skill.mapper';
import { SkillNotActiveError } from '../../../application/skills.errors';

describe('LocalSkillRepository', () => {
  let repository: LocalSkillRepository;
  let activationRepo: jest.Mocked<Repository<SkillActivationRecord>>;
  let mockManager: {
    findOne: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
    query: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const userId = randomUUID();
  const skillId = randomUUID();

  beforeEach(() => {
    activationRepo = {
      find: jest.fn(),
      count: jest.fn(),
      manager: {} as EntityManager,
    } as unknown as jest.Mocked<Repository<SkillActivationRecord>>;

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
      query: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const txHost = {
      tx: mockManager,
    } as unknown as TransactionHost<TransactionalAdapterTypeOrm>;

    const mapper = {} as SkillMapper;

    repository = new LocalSkillRepository(
      skillRepo,
      activationRepo,
      mapper,
      txHost,
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
      expect(mockManager.count).toHaveBeenCalledWith(SkillActivationRecord, {
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
      expect(mockManager.find).toHaveBeenCalledWith(SkillActivationRecord, {
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
