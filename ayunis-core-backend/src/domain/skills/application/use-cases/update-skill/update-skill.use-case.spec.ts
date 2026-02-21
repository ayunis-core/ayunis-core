import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { Logger } from '@nestjs/common';
import { UpdateSkillUseCase } from './update-skill.use-case';
import { UpdateSkillCommand } from './update-skill.command';
import { SkillRepository } from '../../ports/skill.repository';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import type { UUID } from 'crypto';
import {
  SkillNotFoundError,
  DuplicateSkillNameError,
} from '../../skills.errors';

describe('UpdateSkillUseCase', () => {
  let useCase: UpdateSkillUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockSkillId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  beforeAll(async () => {
    const mockSkillRepository = {
      findOne: jest.fn(),
      findByNameAndOwner: jest.fn(),
      update: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateSkillUseCase,
        { provide: SkillRepository, useValue: mockSkillRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<UpdateSkillUseCase>(UpdateSkillUseCase);
    skillRepository = module.get(SkillRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update a skill with new name and instructions', async () => {
    const existingSkill = new Skill({
      id: mockSkillId,
      name: 'Legal Research',
      shortDescription: 'Research legal topics.',
      instructions: 'Original instructions.',
      userId: mockUserId,
    });

    const command = new UpdateSkillCommand({
      skillId: mockSkillId,
      name: 'Updated Legal Research',
      shortDescription: 'Updated description.',
      instructions: 'Updated instructions.',
    });

    skillRepository.findOne.mockResolvedValue(existingSkill);
    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    skillRepository.update.mockImplementation(async (skill: Skill) => skill);

    const result = await useCase.execute(command);

    expect(result.name).toBe('Updated Legal Research');
    expect(result.shortDescription).toBe('Updated description.');
    expect(result.instructions).toBe('Updated instructions.');
    expect(result.id).toBe(mockSkillId);
  });

  it('should throw SkillNotFoundError when skill does not exist', async () => {
    skillRepository.findOne.mockResolvedValue(null);

    const command = new UpdateSkillCommand({
      skillId: mockSkillId,
      name: 'Updated',
      shortDescription: 'Updated.',
      instructions: 'Updated.',
    });

    await expect(useCase.execute(command)).rejects.toThrow(SkillNotFoundError);
  });

  it('should reject update when new name conflicts with another skill', async () => {
    const existingSkill = new Skill({
      id: mockSkillId,
      name: 'Legal Research',
      shortDescription: 'Research legal topics.',
      instructions: 'Original instructions.',
      userId: mockUserId,
    });

    const conflictingSkill = new Skill({
      id: '660e8400-e29b-41d4-a716-446655440000' as UUID,
      name: 'Data Analysis',
      shortDescription: 'Analyze data.',
      instructions: 'Data analysis instructions.',
      userId: mockUserId,
    });

    const command = new UpdateSkillCommand({
      skillId: mockSkillId,
      name: 'Data Analysis',
      shortDescription: 'Updated.',
      instructions: 'Updated.',
    });

    skillRepository.findOne.mockResolvedValue(existingSkill);
    skillRepository.findByNameAndOwner.mockResolvedValue(conflictingSkill);

    await expect(useCase.execute(command)).rejects.toThrow(
      DuplicateSkillNameError,
    );
  });

  it('should allow update when name stays the same', async () => {
    const existingSkill = new Skill({
      id: mockSkillId,
      name: 'Legal Research',
      shortDescription: 'Research legal topics.',
      instructions: 'Original instructions.',
      userId: mockUserId,
    });

    const command = new UpdateSkillCommand({
      skillId: mockSkillId,
      name: 'Legal Research',
      shortDescription: 'Updated description only.',
      instructions: 'Updated instructions only.',
    });

    skillRepository.findOne.mockResolvedValue(existingSkill);
    skillRepository.update.mockImplementation(async (skill: Skill) => skill);

    const result = await useCase.execute(command);

    expect(result.name).toBe('Legal Research');
    expect(skillRepository.findByNameAndOwner).not.toHaveBeenCalled();
  });

  it('should preserve mcpIntegrationIds on update', async () => {
    const mcpIds = ['aaa00000-0000-0000-0000-000000000000' as UUID];
    const existingSkill = new Skill({
      id: mockSkillId,
      name: 'Legal Research',
      shortDescription: 'Research legal topics.',
      instructions: 'Original instructions.',
      userId: mockUserId,
      mcpIntegrationIds: mcpIds,
    });

    const command = new UpdateSkillCommand({
      skillId: mockSkillId,
      name: 'Legal Research',
      shortDescription: 'Updated.',
      instructions: 'Updated.',
    });

    skillRepository.findOne.mockResolvedValue(existingSkill);
    skillRepository.update.mockImplementation(async (skill: Skill) => skill);

    const result = await useCase.execute(command);

    expect(result.mcpIntegrationIds).toEqual(mcpIds);
  });
});
