import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { Logger } from '@nestjs/common';
import { ToggleSkillActiveUseCase } from './toggle-skill-active.use-case';
import { ToggleSkillActiveCommand } from './toggle-skill-active.command';
import { SkillRepository } from '../../ports/skill.repository';
import { SkillAccessService } from '../../services/skill-access.service';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import type { UUID } from 'crypto';
import { SkillNotFoundError } from '../../skills.errors';

describe('ToggleSkillActiveUseCase', () => {
  let useCase: ToggleSkillActiveUseCase;
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
      toggleSkillPinned: jest.fn(),
      isSkillPinned: jest.fn(),
      getPinnedSkillIds: jest.fn(),
      update: jest.fn(),
      isSkillActive: jest.fn(),
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
        ToggleSkillActiveUseCase,
        { provide: SkillRepository, useValue: mockSkillRepository },
        { provide: SkillAccessService, useValue: mockSkillAccessService },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<ToggleSkillActiveUseCase>(ToggleSkillActiveUseCase);
    skillRepository = module.get(SkillRepository);
    skillAccessService = module.get(SkillAccessService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should activate an inactive owned skill', async () => {
    const skill = makeSkill();
    skillAccessService.findAccessibleSkill.mockResolvedValue({
      skill,
      userId: mockUserId,
    });
    skillAccessService.resolveIsShared.mockResolvedValue(false);
    skillRepository.isSkillActive.mockResolvedValue(false);
    skillRepository.isSkillPinned.mockResolvedValue(false);
    skillRepository.activateSkill.mockResolvedValue(undefined);

    const result = await useCase.execute(
      new ToggleSkillActiveCommand({ skillId: mockSkillId }),
    );

    expect(result.isActive).toBe(true);
    expect(result.isShared).toBe(false);
    expect(result.isPinned).toBe(false);
    expect(skillRepository.activateSkill).toHaveBeenCalledWith(
      mockSkillId,
      mockUserId,
    );
    expect(skillRepository.deactivateSkill).not.toHaveBeenCalled();
  });

  it('should deactivate an active owned skill with isPinned=false', async () => {
    const skill = makeSkill();
    skillAccessService.findAccessibleSkill.mockResolvedValue({
      skill,
      userId: mockUserId,
    });
    skillAccessService.resolveIsShared.mockResolvedValue(false);
    skillRepository.isSkillActive.mockResolvedValue(true);
    skillRepository.deactivateSkill.mockResolvedValue(undefined);

    const result = await useCase.execute(
      new ToggleSkillActiveCommand({ skillId: mockSkillId }),
    );

    expect(result.isActive).toBe(false);
    expect(result.isPinned).toBe(false);
    expect(skillRepository.deactivateSkill).toHaveBeenCalledWith(
      mockSkillId,
      mockUserId,
    );
    expect(skillRepository.activateSkill).not.toHaveBeenCalled();
  });

  it('should activate a shared skill and return isShared=true', async () => {
    const sharedSkill = makeSkill(mockSkillId, 'other-user' as UUID);
    skillAccessService.findAccessibleSkill.mockResolvedValue({
      skill: sharedSkill,
      userId: mockUserId,
    });
    skillAccessService.resolveIsShared.mockResolvedValue(true);
    skillRepository.isSkillActive.mockResolvedValue(false);
    skillRepository.isSkillPinned.mockResolvedValue(false);
    skillRepository.activateSkill.mockResolvedValue(undefined);

    const result = await useCase.execute(
      new ToggleSkillActiveCommand({ skillId: mockSkillId }),
    );

    expect(result.skill).toBe(sharedSkill);
    expect(result.isActive).toBe(true);
    expect(result.isShared).toBe(true);
    expect(skillRepository.activateSkill).toHaveBeenCalledWith(
      mockSkillId,
      mockUserId,
    );
  });

  it('should throw SkillNotFoundError when skill is not accessible', async () => {
    skillAccessService.findAccessibleSkill.mockRejectedValue(
      new SkillNotFoundError(mockSkillId),
    );

    await expect(
      useCase.execute(new ToggleSkillActiveCommand({ skillId: mockSkillId })),
    ).rejects.toThrow(SkillNotFoundError);
  });
});
