import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { Logger } from '@nestjs/common';
import { AssignKnowledgeBaseToSkillUseCase } from './assign-knowledge-base-to-skill.use-case';
import { AssignKnowledgeBaseToSkillCommand } from './assign-knowledge-base-to-skill.command';
import { SkillRepository } from '../../ports/skill.repository';
import { GetKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { Skill } from '../../../domain/skill.entity';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import {
  SkillNotFoundError,
  SkillKnowledgeBaseNotFoundError,
  SkillKnowledgeBaseAlreadyAssignedError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';

describe('AssignKnowledgeBaseToSkillUseCase', () => {
  let useCase: AssignKnowledgeBaseToSkillUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;
  let getKnowledgeBasesByIdsUseCase: jest.Mocked<GetKnowledgeBasesByIdsUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174003' as UUID;
  const mockSkillId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockKbId = '123e4567-e89b-12d3-a456-426614174010' as UUID;

  beforeEach(async () => {
    const mockSkillRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockGetKnowledgeBasesByIdsUseCase = {
      execute: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignKnowledgeBaseToSkillUseCase,
        { provide: SkillRepository, useValue: mockSkillRepository },
        {
          provide: GetKnowledgeBasesByIdsUseCase,
          useValue: mockGetKnowledgeBasesByIdsUseCase,
        },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(AssignKnowledgeBaseToSkillUseCase);
    skillRepository = module.get(SkillRepository);
    getKnowledgeBasesByIdsUseCase = module.get(GetKnowledgeBasesByIdsUseCase);
    contextService = module.get(ContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockSkill = (knowledgeBaseIds: UUID[] = []): Skill =>
    new Skill({
      id: mockSkillId,
      name: 'Test Skill',
      shortDescription: 'A test skill',
      instructions: 'Test instructions',
      knowledgeBaseIds,
      userId: mockUserId,
    });

  const createMockKnowledgeBase = (
    id: UUID = mockKbId,
    orgId: UUID = mockOrgId,
  ): KnowledgeBase =>
    new KnowledgeBase({
      id,
      name: 'Test KB',
      description: 'A test knowledge base',
      orgId,
      userId: mockUserId,
    });

  it('should assign a knowledge base to the skill', async () => {
    const command = new AssignKnowledgeBaseToSkillCommand(
      mockSkillId,
      mockKbId,
    );
    const skill = createMockSkill();
    const kb = createMockKnowledgeBase();

    skillRepository.findOne.mockResolvedValue(skill);
    getKnowledgeBasesByIdsUseCase.execute.mockResolvedValue([kb]);
    skillRepository.update.mockImplementation(async (s: Skill) => s);

    const result = await useCase.execute(command);

    expect(result.knowledgeBaseIds).toContain(mockKbId);
    expect(skillRepository.update).toHaveBeenCalled();
  });

  it('should throw UnauthorizedAccessError when user not authenticated', async () => {
    contextService.get.mockReturnValue(null);
    const command = new AssignKnowledgeBaseToSkillCommand(
      mockSkillId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('should throw UnauthorizedAccessError when orgId is missing', async () => {
    contextService.get.mockImplementation((key?: string | symbol) => {
      if (key === 'userId') return mockUserId;
      return null;
    });
    const command = new AssignKnowledgeBaseToSkillCommand(
      mockSkillId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('should throw SkillNotFoundError when skill does not exist', async () => {
    skillRepository.findOne.mockResolvedValue(null);
    const command = new AssignKnowledgeBaseToSkillCommand(
      mockSkillId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(SkillNotFoundError);
  });

  it('should throw SkillKnowledgeBaseNotFoundError when KB does not exist', async () => {
    const skill = createMockSkill();
    skillRepository.findOne.mockResolvedValue(skill);
    getKnowledgeBasesByIdsUseCase.execute.mockResolvedValue([]);

    const command = new AssignKnowledgeBaseToSkillCommand(
      mockSkillId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      SkillKnowledgeBaseNotFoundError,
    );
  });

  it('should throw SkillKnowledgeBaseNotFoundError when KB belongs to different org', async () => {
    const skill = createMockSkill();
    skillRepository.findOne.mockResolvedValue(skill);
    // GetKnowledgeBasesByIdsUseCase filters by org — returns empty for wrong org
    getKnowledgeBasesByIdsUseCase.execute.mockResolvedValue([]);

    const command = new AssignKnowledgeBaseToSkillCommand(
      mockSkillId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      SkillKnowledgeBaseNotFoundError,
    );
  });

  it('should throw SkillKnowledgeBaseAlreadyAssignedError when KB is already assigned', async () => {
    const skill = createMockSkill([mockKbId]);
    const kb = createMockKnowledgeBase();

    skillRepository.findOne.mockResolvedValue(skill);
    getKnowledgeBasesByIdsUseCase.execute.mockResolvedValue([kb]);

    const command = new AssignKnowledgeBaseToSkillCommand(
      mockSkillId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      SkillKnowledgeBaseAlreadyAssignedError,
    );
  });

  it('should wrap unexpected errors in UnexpectedSkillError', async () => {
    skillRepository.findOne.mockRejectedValue(
      new Error('Database connection failed'),
    );

    const command = new AssignKnowledgeBaseToSkillCommand(
      mockSkillId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      UnexpectedSkillError,
    );
  });
});
