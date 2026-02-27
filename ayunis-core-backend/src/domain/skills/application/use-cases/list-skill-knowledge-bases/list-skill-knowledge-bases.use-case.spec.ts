import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ListSkillKnowledgeBasesUseCase } from './list-skill-knowledge-bases.use-case';
import { ListSkillKnowledgeBasesQuery } from './list-skill-knowledge-bases.query';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { SkillAccessService } from '../../services/skill-access.service';
import { Skill } from '../../../domain/skill.entity';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';

describe('ListSkillKnowledgeBasesUseCase', () => {
  let useCase: ListSkillKnowledgeBasesUseCase;
  let knowledgeBaseRepository: jest.Mocked<KnowledgeBaseRepository>;
  let contextService: jest.Mocked<ContextService>;
  let skillAccessService: jest.Mocked<SkillAccessService>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174003' as UUID;
  const mockSkillId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockKbId1 = '123e4567-e89b-12d3-a456-426614174010' as UUID;
  const mockKbId2 = '123e4567-e89b-12d3-a456-426614174011' as UUID;

  beforeEach(async () => {
    const mockKnowledgeBaseRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAllByUserId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      assignSourceToKnowledgeBase: jest.fn(),
      findSourcesByKnowledgeBaseId: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
    } as jest.Mocked<KnowledgeBaseRepository>;

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const mockSkillAccessService = {
      findAccessibleSkill: jest.fn(),
    } as unknown as jest.Mocked<SkillAccessService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListSkillKnowledgeBasesUseCase,
        {
          provide: KnowledgeBaseRepository,
          useValue: mockKnowledgeBaseRepository,
        },
        { provide: ContextService, useValue: mockContextService },
        { provide: SkillAccessService, useValue: mockSkillAccessService },
      ],
    }).compile();

    useCase = module.get(ListSkillKnowledgeBasesUseCase);
    knowledgeBaseRepository = module.get(KnowledgeBaseRepository);
    contextService = module.get(ContextService);
    skillAccessService = module.get(SkillAccessService);

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
    id: UUID,
    name: string,
    orgId: UUID = mockOrgId,
  ): KnowledgeBase =>
    new KnowledgeBase({
      id,
      name,
      description: `Description for ${name}`,
      orgId,
      userId: mockUserId,
    });

  describe('execute', () => {
    it('should return knowledge bases for an accessible skill', async () => {
      const query = new ListSkillKnowledgeBasesQuery(mockSkillId);
      const skill = createMockSkill([mockKbId1, mockKbId2]);
      const kb1 = createMockKnowledgeBase(mockKbId1, 'Legal KB');
      const kb2 = createMockKnowledgeBase(mockKbId2, 'HR KB');

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);
      knowledgeBaseRepository.findByIds.mockResolvedValue([kb1, kb2]);

      const result = await useCase.execute(query);

      expect(skillAccessService.findAccessibleSkill).toHaveBeenCalledWith(
        mockSkillId,
      );
      expect(knowledgeBaseRepository.findByIds).toHaveBeenCalledWith([
        mockKbId1,
        mockKbId2,
      ]);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(kb1);
      expect(result[1]).toBe(kb2);
    });

    it('should filter out knowledge bases from other organizations', async () => {
      const query = new ListSkillKnowledgeBasesQuery(mockSkillId);
      const otherOrgId = '123e4567-e89b-12d3-a456-426614174099' as UUID;
      const skill = createMockSkill([mockKbId1, mockKbId2]);
      const kb1 = createMockKnowledgeBase(mockKbId1, 'Own Org KB', mockOrgId);
      const kb2 = createMockKnowledgeBase(
        mockKbId2,
        'Other Org KB',
        otherOrgId,
      );

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);
      knowledgeBaseRepository.findByIds.mockResolvedValue([kb1, kb2]);

      const result = await useCase.execute(query);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(kb1);
    });

    it('should return empty array when skill has no knowledge bases', async () => {
      const query = new ListSkillKnowledgeBasesQuery(mockSkillId);
      const skill = createMockSkill([]);

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);

      const result = await useCase.execute(query);

      expect(knowledgeBaseRepository.findByIds).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should throw UnauthorizedAccessError when orgId is missing', async () => {
      const query = new ListSkillKnowledgeBasesQuery(mockSkillId);
      contextService.get.mockReturnValue(null);

      await expect(useCase.execute(query)).rejects.toThrow(
        UnauthorizedAccessError,
      );
      expect(skillAccessService.findAccessibleSkill).not.toHaveBeenCalled();
    });

    it('should throw SkillNotFoundError when skill is not accessible', async () => {
      const query = new ListSkillKnowledgeBasesQuery(mockSkillId);
      skillAccessService.findAccessibleSkill.mockRejectedValue(
        new SkillNotFoundError(mockSkillId),
      );

      await expect(useCase.execute(query)).rejects.toThrow(SkillNotFoundError);
    });

    it('should wrap unexpected errors in UnexpectedSkillError', async () => {
      const query = new ListSkillKnowledgeBasesQuery(mockSkillId);
      skillAccessService.findAccessibleSkill.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(useCase.execute(query)).rejects.toThrow(
        UnexpectedSkillError,
      );
    });

    it('should rethrow ApplicationError without wrapping', async () => {
      const query = new ListSkillKnowledgeBasesQuery(mockSkillId);
      const appError = new SkillNotFoundError(mockSkillId);
      skillAccessService.findAccessibleSkill.mockRejectedValue(appError);

      await expect(useCase.execute(query)).rejects.toThrow(appError);
    });
  });
});
