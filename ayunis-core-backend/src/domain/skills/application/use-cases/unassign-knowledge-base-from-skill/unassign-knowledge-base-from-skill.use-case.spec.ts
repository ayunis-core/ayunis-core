import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { Logger } from '@nestjs/common';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnassignKnowledgeBaseFromSkillUseCase } from './unassign-knowledge-base-from-skill.use-case';
import { UnassignKnowledgeBaseFromSkillCommand } from './unassign-knowledge-base-from-skill.command';
import { SkillRepository } from '../../ports/skill.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Skill } from '../../../domain/skill.entity';
import {
  SkillNotFoundError,
  SkillKnowledgeBaseNotAssignedError,
  UnexpectedSkillError,
} from '../../skills.errors';
import type { UUID } from 'crypto';

describe('UnassignKnowledgeBaseFromSkillUseCase', () => {
  let useCase: UnassignKnowledgeBaseFromSkillUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;
  let contextService: jest.Mocked<ContextService>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockSkillId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockKbId = '123e4567-e89b-12d3-a456-426614174010' as UUID;

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
        UnassignKnowledgeBaseFromSkillUseCase,
        { provide: SkillRepository, useValue: mockSkillRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(UnassignKnowledgeBaseFromSkillUseCase);
    skillRepository = module.get(SkillRepository);
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

  it('should unassign a knowledge base from the skill', async () => {
    const skill = createMockSkill([mockKbId]);
    const command = new UnassignKnowledgeBaseFromSkillCommand(
      mockSkillId,
      mockKbId,
    );

    skillRepository.findOne.mockResolvedValue(skill);
    skillRepository.update.mockImplementation(async (s: Skill) => s);

    const result = await useCase.execute(command);

    expect(result.knowledgeBaseIds).not.toContain(mockKbId);
    expect(result.knowledgeBaseIds).toHaveLength(0);
    expect(skillRepository.update).toHaveBeenCalled();
  });

  it('should only remove the specified knowledge base', async () => {
    const otherKbId = '123e4567-e89b-12d3-a456-426614174011' as UUID;
    const skill = createMockSkill([mockKbId, otherKbId]);
    const command = new UnassignKnowledgeBaseFromSkillCommand(
      mockSkillId,
      mockKbId,
    );

    skillRepository.findOne.mockResolvedValue(skill);
    skillRepository.update.mockImplementation(async (s: Skill) => s);

    const result = await useCase.execute(command);

    expect(result.knowledgeBaseIds).toEqual([otherKbId]);
  });

  it('should throw UnauthorizedAccessError when user not authenticated', async () => {
    contextService.get.mockReturnValue(null);
    const command = new UnassignKnowledgeBaseFromSkillCommand(
      mockSkillId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });

  it('should throw SkillNotFoundError when skill does not exist', async () => {
    skillRepository.findOne.mockResolvedValue(null);
    const command = new UnassignKnowledgeBaseFromSkillCommand(
      mockSkillId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(SkillNotFoundError);
  });

  it('should throw SkillKnowledgeBaseNotAssignedError when KB is not assigned', async () => {
    const skill = createMockSkill([]);
    skillRepository.findOne.mockResolvedValue(skill);

    const command = new UnassignKnowledgeBaseFromSkillCommand(
      mockSkillId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      SkillKnowledgeBaseNotAssignedError,
    );
  });

  it('should wrap unexpected errors in UnexpectedSkillError', async () => {
    skillRepository.findOne.mockRejectedValue(
      new Error('Database connection failed'),
    );

    const command = new UnassignKnowledgeBaseFromSkillCommand(
      mockSkillId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      UnexpectedSkillError,
    );
  });
});
