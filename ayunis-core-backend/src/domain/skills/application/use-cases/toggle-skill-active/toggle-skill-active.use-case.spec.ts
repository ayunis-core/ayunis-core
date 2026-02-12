import { Test, TestingModule } from '@nestjs/testing';

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
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UUID } from 'crypto';
import { SkillNotFoundError } from '../../skills.errors';

describe('ToggleSkillActiveUseCase', () => {
  let useCase: ToggleSkillActiveUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockSkillId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  beforeEach(async () => {
    const mockSkillRepository = {
      findOne: jest.fn(),
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
        ToggleSkillActiveUseCase,
        { provide: SkillRepository, useValue: mockSkillRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<ToggleSkillActiveUseCase>(ToggleSkillActiveUseCase);
    skillRepository = module.get(SkillRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should toggle inactive skill to active', async () => {
    const inactiveSkill = new Skill({
      id: mockSkillId,
      name: 'Legal Research',
      shortDescription: 'Research legal topics.',
      instructions: 'Instructions.',
      userId: mockUserId,
      isActive: false,
    });

    skillRepository.findOne.mockResolvedValue(inactiveSkill);
    skillRepository.update.mockImplementation(async (skill: Skill) => skill);

    const result = await useCase.execute(
      new ToggleSkillActiveCommand({ skillId: mockSkillId }),
    );

    expect(result.isActive).toBe(true);
  });

  it('should toggle active skill to inactive', async () => {
    const activeSkill = new Skill({
      id: mockSkillId,
      name: 'Legal Research',
      shortDescription: 'Research legal topics.',
      instructions: 'Instructions.',
      userId: mockUserId,
      isActive: true,
    });

    skillRepository.findOne.mockResolvedValue(activeSkill);
    skillRepository.update.mockImplementation(async (skill: Skill) => skill);

    const result = await useCase.execute(
      new ToggleSkillActiveCommand({ skillId: mockSkillId }),
    );

    expect(result.isActive).toBe(false);
  });

  it('should throw SkillNotFoundError when skill does not exist', async () => {
    skillRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(new ToggleSkillActiveCommand({ skillId: mockSkillId })),
    ).rejects.toThrow(SkillNotFoundError);
  });
});
