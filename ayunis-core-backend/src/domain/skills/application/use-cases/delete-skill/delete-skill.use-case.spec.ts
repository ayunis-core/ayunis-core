import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { Logger } from '@nestjs/common';
import { DeleteSkillUseCase } from './delete-skill.use-case';
import { DeleteSkillCommand } from './delete-skill.command';
import { SkillRepository } from '../../ports/skill.repository';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import type { UUID } from 'crypto';
import { SkillNotFoundError } from '../../skills.errors';

describe('DeleteSkillUseCase', () => {
  let useCase: DeleteSkillUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockSkillId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

  beforeEach(async () => {
    const mockSkillRepository = {
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteSkillUseCase,
        { provide: SkillRepository, useValue: mockSkillRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<DeleteSkillUseCase>(DeleteSkillUseCase);
    skillRepository = module.get(SkillRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delete an existing skill', async () => {
    const existingSkill = new Skill({
      id: mockSkillId,
      name: 'Legal Research',
      shortDescription: 'Research legal topics.',
      instructions: 'You are a legal research assistant.',
      userId: mockUserId,
    });

    skillRepository.findOne.mockResolvedValue(existingSkill);
    skillRepository.delete.mockResolvedValue();

    await useCase.execute(new DeleteSkillCommand({ skillId: mockSkillId }));

    expect(skillRepository.findOne).toHaveBeenCalledWith(
      mockSkillId,
      mockUserId,
    );
    expect(skillRepository.delete).toHaveBeenCalledWith(
      mockSkillId,
      mockUserId,
    );
  });

  it('should throw SkillNotFoundError when skill does not exist', async () => {
    skillRepository.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(new DeleteSkillCommand({ skillId: mockSkillId })),
    ).rejects.toThrow(SkillNotFoundError);

    expect(skillRepository.delete).not.toHaveBeenCalled();
  });
});
