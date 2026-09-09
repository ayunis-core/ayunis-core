import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { CreateSkillUseCase } from './create-skill.use-case';
import { CreateSkillCommand } from './create-skill.command';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';

import { ContextService } from 'src/common/context/services/context.service';
import type { UUID } from 'crypto';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
} from 'src/domain/skills/application/skills.errors';

describe('CreateSkillUseCase', () => {
  let useCase: CreateSkillUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeAll(async () => {
    const mockSkillRepository = {
      create: jest.fn(),
      findByNameAndOwner: jest.fn(),
      findByNameAndWorkspace: jest.fn(),
      activateSkill: jest.fn(),
      activateWorkspaceSkill: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateSkillUseCase,
        { provide: SkillRepository, useValue: mockSkillRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<CreateSkillUseCase>(CreateSkillUseCase);
    skillRepository = module.get(SkillRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a skill successfully', async () => {
    const command = new CreateSkillCommand({
      name: 'Legal Research',
      shortDescription: 'Research legal topics and find case law.',
      instructions:
        'You are a legal research assistant. Search through legal databases...',
    });

    const expectedSkill = new PersonalSkill({
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      userId: mockUserId,
    });

    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    skillRepository.create.mockResolvedValue(expectedSkill);

    const result = await useCase.execute(command);

    expect(skillRepository.findByNameAndOwner).toHaveBeenCalledWith(
      'Legal Research',
      mockUserId,
    );
    expect(skillRepository.create).toHaveBeenCalledWith(
      expect.any(PersonalSkill),
    );
    expect(result.name).toBe('Legal Research');
    expect(result.shortDescription).toBe(
      'Research legal topics and find case law.',
    );
  });

  it('should translate invalid domain names to a skill application error', async () => {
    const command = new CreateSkillCommand({
      name: ' Invalid name',
      shortDescription: 'Invalid skill.',
      instructions: 'Invalid instructions.',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      SkillInvalidInputError,
    );
    expect(skillRepository.findByNameAndOwner).not.toHaveBeenCalled();
    expect(skillRepository.create).not.toHaveBeenCalled();
  });

  it('should reject creation when skill name already exists for the user', async () => {
    const command = new CreateSkillCommand({
      name: 'Legal Research',
      shortDescription: 'Duplicate name skill.',
      instructions: 'Some instructions.',
    });

    const existingSkill = new PersonalSkill({
      name: 'Legal Research',
      shortDescription: 'Existing skill.',
      instructions: 'Existing instructions.',
      userId: mockUserId,
    });

    skillRepository.findByNameAndOwner.mockResolvedValue(existingSkill);

    await expect(useCase.execute(command)).rejects.toThrow(
      DuplicateSkillNameError,
    );
    expect(skillRepository.create).not.toHaveBeenCalled();
  });

  it('creates an independently owned workspace skill', async () => {
    const workspaceId = '223e4567-e89b-12d3-a456-426614174001' as UUID;
    const mcpIntegrationId = '423e4567-e89b-12d3-a456-426614174003' as UUID;
    const command = new CreateSkillCommand({
      name: 'Workspace legal research',
      shortDescription: 'Researches workspace legal topics.',
      instructions: 'Use the workspace legal sources.',
      workspaceId,
      mcpIntegrationIds: [mcpIntegrationId],
    });
    skillRepository.findByNameAndWorkspace.mockResolvedValue(null);
    skillRepository.create.mockImplementation(async (skill) => skill);

    const result = await useCase.execute(command);

    expect(result).toMatchObject({
      workspaceId,
      mcpIntegrationIds: [mcpIntegrationId],
      sourceIds: [],
      knowledgeBaseIds: [],
    });
    expect(skillRepository.activateSkill).not.toHaveBeenCalled();
    expect(skillRepository.activateWorkspaceSkill).toHaveBeenCalledWith(
      result.id,
      workspaceId,
    );
  });

  it('should activate the skill when isActive is true in command', async () => {
    const command = new CreateSkillCommand({
      name: 'Active Skill',
      shortDescription: 'An active skill.',
      instructions: 'You are an active assistant.',
      isActive: true,
    });

    const createdSkill = new PersonalSkill({
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      userId: mockUserId,
    });

    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    skillRepository.create.mockResolvedValue(createdSkill);
    skillRepository.activateSkill.mockResolvedValue(undefined);

    await useCase.execute(command);

    expect(skillRepository.activateSkill).toHaveBeenCalledWith(
      createdSkill.id,
      mockUserId,
    );
  });

  it('should not activate the skill when isActive is not set', async () => {
    const command = new CreateSkillCommand({
      name: 'Data Analysis',
      shortDescription: 'Analyze data.',
      instructions: 'You are a data analysis expert.',
    });

    const createdSkill = new PersonalSkill({
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      userId: mockUserId,
    });

    skillRepository.findByNameAndOwner.mockResolvedValue(null);
    skillRepository.create.mockResolvedValue(createdSkill);

    await useCase.execute(command);

    expect(skillRepository.activateSkill).not.toHaveBeenCalled();
  });
});
