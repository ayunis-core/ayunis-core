import { getLoggerToken } from 'nestjs-pino';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { CreateSkillUseCase } from './create-skill.use-case';
import { CreateSkillCommand } from './create-skill.command';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import type { UUID } from 'crypto';
import { DuplicateSkillNameError } from 'src/domain/skills/application/skills.errors';

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
        {
          provide: getLoggerToken(CreateSkillUseCase.name),
          useValue: createPinoLoggerMock(),
        },
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

    const expectedSkill = new Skill({
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
    expect(skillRepository.create).toHaveBeenCalledWith(expect.any(Skill));
    expect(result.name).toBe('Legal Research');
    expect(result.shortDescription).toBe(
      'Research legal topics and find case law.',
    );
  });

  it('should reject creation when skill name already exists for the user', async () => {
    const command = new CreateSkillCommand({
      name: 'Legal Research',
      shortDescription: 'Duplicate name skill.',
      instructions: 'Some instructions.',
    });

    const existingSkill = new Skill({
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
    const originSkillId = '323e4567-e89b-12d3-a456-426614174002' as UUID;
    const mcpIntegrationId = '423e4567-e89b-12d3-a456-426614174003' as UUID;
    const command = new CreateSkillCommand({
      name: 'Workspace legal research',
      shortDescription: 'Researches workspace legal topics.',
      instructions: 'Use the workspace legal sources.',
      workspaceId,
      originSkillId,
      importedOriginVersion: 3,
      mcpIntegrationIds: [mcpIntegrationId],
    });
    skillRepository.findByNameAndWorkspace.mockResolvedValue(null);
    skillRepository.create.mockImplementation(async (skill) => skill);

    const result = await useCase.execute(command);

    expect(result).toMatchObject({
      userId: null,
      workspaceId,
      originSkillId,
      importedOriginVersion: 3,
      mcpIntegrationIds: [mcpIntegrationId],
      sourceIds: [],
      knowledgeBaseIds: [],
    });
    expect(skillRepository.activateSkill).not.toHaveBeenCalled();
  });

  it('should activate the skill when isActive is true in command', async () => {
    const command = new CreateSkillCommand({
      name: 'Active Skill',
      shortDescription: 'An active skill.',
      instructions: 'You are an active assistant.',
      isActive: true,
    });

    const createdSkill = new Skill({
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

    const createdSkill = new Skill({
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
