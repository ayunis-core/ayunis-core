import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { Logger } from '@nestjs/common';
import { ToggleSkillPinnedUseCase } from './toggle-skill-pinned.use-case';
import { ToggleSkillPinnedCommand } from './toggle-skill-pinned.command';
import { SkillRepository } from '../../ports/skill.repository';
import { SkillAccessService } from '../../services/skill-access.service';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import type { UUID } from 'crypto';
import { SkillNotFoundError, SkillNotActiveError } from '../../skills.errors';

describe('ToggleSkillPinnedUseCase', () => {
  let useCase: ToggleSkillPinnedUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;
  let skillAccessService: jest.Mocked<SkillAccessService>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockSkillId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  const makeSkill = (id: UUID = mockSkillId, userId: UUID = mockUserId) =>
    new Skill({
      id,
      name: 'Legal Research',
      shortDescription: 'Research legal topics.',
      instructions: 'Instructions.',
      userId,
    });

  beforeEach(async () => {
    const mockSkillRepository = {
      findOne: jest.fn(),
      findByIds: jest.fn(),
      isSkillActive: jest.fn(),
      toggleSkillPinned: jest.fn(),
      isSkillPinned: jest.fn(),
      getPinnedSkillIds: jest.fn(),
      activateSkill: jest.fn(),
      deactivateSkill: jest.fn(),
    };

    const mockSkillAccessService = {
      findAccessibleSkill: jest.fn(),
      resolveIsShared: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToggleSkillPinnedUseCase,
        { provide: SkillRepository, useValue: mockSkillRepository },
        { provide: SkillAccessService, useValue: mockSkillAccessService },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<ToggleSkillPinnedUseCase>(ToggleSkillPinnedUseCase);
    skillRepository = module.get(SkillRepository);
    skillAccessService = module.get(SkillAccessService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should pin an active unpinned skill and return isShared', async () => {
    const skill = makeSkill();
    skillAccessService.findAccessibleSkill.mockResolvedValue({
      skill,
      userId: mockUserId,
    });
    skillAccessService.resolveIsShared.mockResolvedValue(false);
    skillRepository.isSkillActive.mockResolvedValue(true);
    skillRepository.toggleSkillPinned.mockResolvedValue(true);

    const result = await useCase.execute(
      new ToggleSkillPinnedCommand({ skillId: mockSkillId }),
    );

    expect(result.isPinned).toBe(true);
    expect(result.isShared).toBe(false);
    expect(result.skill).toBe(skill);
    expect(skillRepository.toggleSkillPinned).toHaveBeenCalledWith(
      mockSkillId,
      mockUserId,
    );
  });

  it('should unpin a pinned skill', async () => {
    const skill = makeSkill();
    skillAccessService.findAccessibleSkill.mockResolvedValue({
      skill,
      userId: mockUserId,
    });
    skillAccessService.resolveIsShared.mockResolvedValue(false);
    skillRepository.isSkillActive.mockResolvedValue(true);
    skillRepository.toggleSkillPinned.mockResolvedValue(false);

    const result = await useCase.execute(
      new ToggleSkillPinnedCommand({ skillId: mockSkillId }),
    );

    expect(result.isPinned).toBe(false);
    expect(skillRepository.toggleSkillPinned).toHaveBeenCalledWith(
      mockSkillId,
      mockUserId,
    );
  });

  it('should throw SkillNotActiveError when skill is not active', async () => {
    const skill = makeSkill();
    skillAccessService.findAccessibleSkill.mockResolvedValue({
      skill,
      userId: mockUserId,
    });
    skillRepository.isSkillActive.mockResolvedValue(false);

    await expect(
      useCase.execute(new ToggleSkillPinnedCommand({ skillId: mockSkillId })),
    ).rejects.toThrow(SkillNotActiveError);

    expect(skillRepository.toggleSkillPinned).not.toHaveBeenCalled();
  });

  it('should throw SkillNotFoundError when skill is not accessible', async () => {
    skillAccessService.findAccessibleSkill.mockRejectedValue(
      new SkillNotFoundError(mockSkillId),
    );

    await expect(
      useCase.execute(new ToggleSkillPinnedCommand({ skillId: mockSkillId })),
    ).rejects.toThrow(SkillNotFoundError);
  });

  it('should toggle pinned on a shared skill and return isShared=true', async () => {
    const sharedSkill = makeSkill(mockSkillId, 'other-user' as UUID);
    skillAccessService.findAccessibleSkill.mockResolvedValue({
      skill: sharedSkill,
      userId: mockUserId,
    });
    skillAccessService.resolveIsShared.mockResolvedValue(true);
    skillRepository.isSkillActive.mockResolvedValue(true);
    skillRepository.toggleSkillPinned.mockResolvedValue(true);

    const result = await useCase.execute(
      new ToggleSkillPinnedCommand({ skillId: mockSkillId }),
    );

    expect(result.skill).toBe(sharedSkill);
    expect(result.isPinned).toBe(true);
    expect(result.isShared).toBe(true);
  });
});
