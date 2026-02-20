import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SkillShareAuthorizationStrategy } from './skill-share-authorization.strategy';
import { SkillRepository } from '../ports/skill.repository';
import type { Skill } from '../../domain/skill.entity';
import { randomUUID } from 'crypto';

describe('SkillShareAuthorizationStrategy', () => {
  let strategy: SkillShareAuthorizationStrategy;
  let skillRepository: jest.Mocked<SkillRepository>;

  beforeEach(async () => {
    const mockSkillRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      findAllByOwner: jest.fn(),
      findActiveByOwner: jest.fn(),
      findByNameAndOwner: jest.fn(),
      activateSkill: jest.fn(),
      deactivateSkill: jest.fn(),
      isSkillActive: jest.fn(),
      getActiveSkillIds: jest.fn(),
      findByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillShareAuthorizationStrategy,
        {
          provide: SkillRepository,
          useValue: mockSkillRepository,
        },
      ],
    }).compile();

    strategy = module.get<SkillShareAuthorizationStrategy>(
      SkillShareAuthorizationStrategy,
    );
    skillRepository = module.get(SkillRepository);
  });

  describe('canViewShares', () => {
    it('should return true when user owns the skill', async () => {
      const skillId = randomUUID();
      const userId = randomUUID();
      const mockSkill = {
        id: skillId,
        userId,
        name: 'Research Assistant',
      } as Skill;

      skillRepository.findOne.mockResolvedValue(mockSkill);

      const result = await strategy.canViewShares(skillId, userId);

      expect(result).toBe(true);
      expect(skillRepository.findOne).toHaveBeenCalledWith(skillId, userId);
    });

    it('should return false when skill does not exist', async () => {
      const skillId = randomUUID();
      const userId = randomUUID();

      skillRepository.findOne.mockResolvedValue(null);

      const result = await strategy.canViewShares(skillId, userId);

      expect(result).toBe(false);
      expect(skillRepository.findOne).toHaveBeenCalledWith(skillId, userId);
    });

    it('should return false when user does not own the skill', async () => {
      const skillId = randomUUID();
      const userId = randomUUID();

      skillRepository.findOne.mockResolvedValue(null);

      const result = await strategy.canViewShares(skillId, userId);

      expect(result).toBe(false);
      expect(skillRepository.findOne).toHaveBeenCalledWith(skillId, userId);
    });
  });

  describe('canCreateShare', () => {
    it('should return true when user owns the skill', async () => {
      const skillId = randomUUID();
      const userId = randomUUID();
      const mockSkill = {
        id: skillId,
        userId,
        name: 'Code Review',
      } as Skill;

      skillRepository.findOne.mockResolvedValue(mockSkill);

      const result = await strategy.canCreateShare(skillId, userId);

      expect(result).toBe(true);
      expect(skillRepository.findOne).toHaveBeenCalledWith(skillId, userId);
    });

    it('should return false when skill does not exist', async () => {
      const skillId = randomUUID();
      const userId = randomUUID();

      skillRepository.findOne.mockResolvedValue(null);

      const result = await strategy.canCreateShare(skillId, userId);

      expect(result).toBe(false);
      expect(skillRepository.findOne).toHaveBeenCalledWith(skillId, userId);
    });

    it('should return false when user does not own the skill', async () => {
      const skillId = randomUUID();
      const userId = randomUUID();

      skillRepository.findOne.mockResolvedValue(null);

      const result = await strategy.canCreateShare(skillId, userId);

      expect(result).toBe(false);
      expect(skillRepository.findOne).toHaveBeenCalledWith(skillId, userId);
    });
  });

  describe('canDeleteShare', () => {
    it('should always return true since deletion auth is handled at share level', async () => {
      const shareId = randomUUID();
      const userId = randomUUID();

      const result = await strategy.canDeleteShare(shareId, userId);

      expect(result).toBe(true);
      expect(skillRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return true regardless of user or share', async () => {
      const result1 = await strategy.canDeleteShare(randomUUID(), randomUUID());
      const result2 = await strategy.canDeleteShare(randomUUID(), randomUUID());

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(skillRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
