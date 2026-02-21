import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SkillAccessService } from './skill-access.service';
import { SkillRepository } from '../ports/skill.repository';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { Skill } from '../../domain/skill.entity';
import { SkillNotFoundError } from '../skills.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';

describe('SkillAccessService', () => {
  let service: SkillAccessService;
  let skillRepository: jest.Mocked<SkillRepository>;
  let findShareByEntityUseCase: jest.Mocked<FindShareByEntityUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const otherUserId = '223e4567-e89b-12d3-a456-426614174001' as UUID;
  const skillId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  const makeSkill = (id: UUID = skillId, owner: UUID = userId) =>
    new Skill({
      id,
      name: 'Legal Research',
      shortDescription: 'Research legal topics.',
      instructions: 'Research instructions.',
      userId: owner,
    });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillAccessService,
        {
          provide: SkillRepository,
          useValue: {
            findOne: jest.fn(),
            findByIds: jest.fn(),
            isSkillActive: jest.fn(),
            isSkillPinned: jest.fn(),
            getActiveSkillIds: jest.fn(),
            getPinnedSkillIds: jest.fn(),
          },
        },
        {
          provide: FindShareByEntityUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'userId') return userId;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(SkillAccessService);
    skillRepository = module.get(SkillRepository);
    findShareByEntityUseCase = module.get(FindShareByEntityUseCase);
    contextService = module.get(ContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAccessibleSkill', () => {
    it('should return owned skill without checking shares', async () => {
      const skill = makeSkill();
      skillRepository.findOne.mockResolvedValue(skill);

      const result = await service.findAccessibleSkill(skillId);

      expect(result).toBe(skill);
      expect(findShareByEntityUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return shared skill when not owned', async () => {
      const sharedSkill = makeSkill(skillId, otherUserId);
      skillRepository.findOne.mockResolvedValue(null);
      findShareByEntityUseCase.execute.mockResolvedValue({} as never);
      skillRepository.findByIds.mockResolvedValue([sharedSkill]);

      const result = await service.findAccessibleSkill(skillId);

      expect(result).toBe(sharedSkill);
    });

    it('should throw SkillNotFoundError when skill is not owned or shared', async () => {
      skillRepository.findOne.mockResolvedValue(null);
      findShareByEntityUseCase.execute.mockResolvedValue(null);

      await expect(service.findAccessibleSkill(skillId)).rejects.toThrow(
        SkillNotFoundError,
      );
    });

    it('should throw UnauthorizedAccessError when no user in context', async () => {
      contextService.get.mockReturnValue(undefined);

      await expect(service.findAccessibleSkill(skillId)).rejects.toThrow(
        UnauthorizedAccessError,
      );
    });
  });

  describe('resolveIsShared', () => {
    it('should return false when user owns the skill', async () => {
      const skill = makeSkill();
      skillRepository.findOne.mockResolvedValue(skill);

      const result = await service.resolveIsShared(skillId, userId);

      expect(result).toBe(false);
      expect(findShareByEntityUseCase.execute).not.toHaveBeenCalled();
    });

    it('should return true when skill is shared with user', async () => {
      skillRepository.findOne.mockResolvedValue(null);
      findShareByEntityUseCase.execute.mockResolvedValue({} as never);

      const result = await service.resolveIsShared(skillId, userId);

      expect(result).toBe(true);
    });

    it('should return false when skill is neither owned nor shared', async () => {
      skillRepository.findOne.mockResolvedValue(null);
      findShareByEntityUseCase.execute.mockResolvedValue(null);

      const result = await service.resolveIsShared(skillId, userId);

      expect(result).toBe(false);
    });
  });

  describe('resolveUserContext', () => {
    it('should return isActive, isPinned, and isShared for a skill', async () => {
      const skill = makeSkill();
      skillRepository.isSkillActive.mockResolvedValue(true);
      skillRepository.isSkillPinned.mockResolvedValue(true);
      skillRepository.findOne.mockResolvedValue(skill);

      const result = await service.resolveUserContext(skillId);

      expect(result).toEqual({
        isActive: true,
        isPinned: true,
        isShared: false,
      });
    });

    it('should resolve isShared=true for non-owned skill', async () => {
      skillRepository.isSkillActive.mockResolvedValue(true);
      skillRepository.isSkillPinned.mockResolvedValue(false);
      skillRepository.findOne.mockResolvedValue(null);
      findShareByEntityUseCase.execute.mockResolvedValue({} as never);

      const result = await service.resolveUserContext(skillId);

      expect(result).toEqual({
        isActive: true,
        isPinned: false,
        isShared: true,
      });
    });

    it('should throw UnauthorizedAccessError when no user in context', async () => {
      contextService.get.mockReturnValue(undefined);

      await expect(service.resolveUserContext(skillId)).rejects.toThrow(
        UnauthorizedAccessError,
      );
    });
  });

  describe('resolveUserContextBatch', () => {
    it('should return activeSkillIds and pinnedSkillIds', async () => {
      const activeIds = new Set([skillId]);
      const pinnedIds = new Set([skillId]);
      skillRepository.getActiveSkillIds.mockResolvedValue(activeIds);
      skillRepository.getPinnedSkillIds.mockResolvedValue(pinnedIds);

      const result = await service.resolveUserContextBatch();

      expect(result.activeSkillIds).toBe(activeIds);
      expect(result.pinnedSkillIds).toBe(pinnedIds);
    });

    it('should throw UnauthorizedAccessError when no user in context', async () => {
      contextService.get.mockReturnValue(undefined);

      await expect(service.resolveUserContextBatch()).rejects.toThrow(
        UnauthorizedAccessError,
      );
    });
  });
});
