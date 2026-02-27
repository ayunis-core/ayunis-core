import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ListSkillSourcesUseCase } from './list-skill-sources.use-case';
import { ListSkillSourcesQuery } from './list-skill-sources.query';
import { SkillRepository } from '../../ports/skill.repository';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { Skill } from '../../../domain/skill.entity';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import type { UUID } from 'crypto';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType, FileType } from 'src/domain/sources/domain/source-type.enum';

describe('ListSkillSourcesUseCase', () => {
  let useCase: ListSkillSourcesUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;
  let getSourcesByIdsUseCase: jest.Mocked<GetSourcesByIdsUseCase>;
  let contextService: jest.Mocked<ContextService>;
  let findShareByEntityUseCase: jest.Mocked<FindShareByEntityUseCase>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockSkillId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockSourceId1 = '123e4567-e89b-12d3-a456-426614174010' as UUID;
  const mockSourceId2 = '123e4567-e89b-12d3-a456-426614174011' as UUID;

  beforeEach(async () => {
    const mockSkillRepository = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      findAllByOwner: jest.fn(),
      findActiveByOwner: jest.fn(),
      findByNameAndOwner: jest.fn(),
      activateSkill: jest.fn(),
      deactivateSkill: jest.fn(),
      isSkillActive: jest.fn(),
      getActiveSkillIds: jest.fn(),
      deactivateAllExceptOwner: jest.fn(),
      deactivateUsersNotInSet: jest.fn(),
      findByIds: jest.fn(),
      toggleSkillPinned: jest.fn(),
      isSkillPinned: jest.fn(),
      getPinnedSkillIds: jest.fn(),
      findSkillsByKnowledgeBaseAndOwners: jest.fn(),
      removeKnowledgeBaseFromSkills: jest.fn(),
    } as jest.Mocked<SkillRepository>;

    const mockGetSourcesByIdsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetSourcesByIdsUseCase>;

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const mockFindShareByEntityUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindShareByEntityUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListSkillSourcesUseCase,
        { provide: SkillRepository, useValue: mockSkillRepository },
        {
          provide: GetSourcesByIdsUseCase,
          useValue: mockGetSourcesByIdsUseCase,
        },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: FindShareByEntityUseCase,
          useValue: mockFindShareByEntityUseCase,
        },
      ],
    }).compile();

    useCase = module.get(ListSkillSourcesUseCase);
    skillRepository = module.get(SkillRepository);
    getSourcesByIdsUseCase = module.get(GetSourcesByIdsUseCase);
    contextService = module.get(ContextService);
    findShareByEntityUseCase = module.get(FindShareByEntityUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockSkill = (sourceIds: UUID[] = []): Skill => {
    return new Skill({
      id: mockSkillId,
      name: 'Test Skill',
      shortDescription: 'A test skill',
      instructions: 'Test instructions',
      sourceIds,
      userId: mockUserId,
    });
  };

  const createMockSource = (id: UUID, name: string): FileSource => {
    return new FileSource({
      id,
      name,
      type: TextType.FILE,
      fileType: FileType.PDF,
      text: 'test content',
      contentChunks: [],
    });
  };

  describe('execute', () => {
    it('should return sources for an owned skill', async () => {
      const query = new ListSkillSourcesQuery(mockSkillId);
      const mockSkill = createMockSkill([mockSourceId1, mockSourceId2]);
      const mockSource1 = createMockSource(mockSourceId1, 'Document A');
      const mockSource2 = createMockSource(mockSourceId2, 'Document B');

      skillRepository.findOne.mockResolvedValue(mockSkill);
      getSourcesByIdsUseCase.execute.mockResolvedValue([
        mockSource1,
        mockSource2,
      ]);

      const result = await useCase.execute(query);

      expect(skillRepository.findOne).toHaveBeenCalledWith(
        mockSkillId,
        mockUserId,
      );
      expect(findShareByEntityUseCase.execute).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockSource1);
      expect(result[1]).toBe(mockSource2);
    });

    it('should return sources for a shared skill when user does not own it', async () => {
      const query = new ListSkillSourcesQuery(mockSkillId);
      const otherUserId = '123e4567-e89b-12d3-a456-426614174099' as UUID;
      const mockSkill = createMockSkill([mockSourceId1]);
      // Override userId to simulate another owner
      Object.defineProperty(mockSkill, 'userId', { value: otherUserId });
      const mockSource1 = createMockSource(mockSourceId1, 'Shared Document');

      skillRepository.findOne.mockResolvedValue(null); // Not owned
      findShareByEntityUseCase.execute.mockResolvedValue({} as any); // Share exists
      skillRepository.findByIds.mockResolvedValue([mockSkill]);
      getSourcesByIdsUseCase.execute.mockResolvedValue([mockSource1]);

      const result = await useCase.execute(query);

      expect(skillRepository.findOne).toHaveBeenCalledWith(
        mockSkillId,
        mockUserId,
      );
      expect(findShareByEntityUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: SharedEntityType.SKILL,
          entityId: mockSkillId,
        }),
      );
      expect(skillRepository.findByIds).toHaveBeenCalledWith([mockSkillId]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockSource1);
    });

    it('should return empty array when skill has no sources', async () => {
      const query = new ListSkillSourcesQuery(mockSkillId);
      const mockSkill = createMockSkill([]);

      skillRepository.findOne.mockResolvedValue(mockSkill);

      const result = await useCase.execute(query);

      expect(getSourcesByIdsUseCase.execute).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      const query = new ListSkillSourcesQuery(mockSkillId);
      contextService.get.mockReturnValue(null);

      await expect(useCase.execute(query)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(skillRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw SkillNotFoundError when skill is not owned and not shared', async () => {
      const query = new ListSkillSourcesQuery(mockSkillId);
      skillRepository.findOne.mockResolvedValue(null);
      findShareByEntityUseCase.execute.mockResolvedValue(null);

      await expect(useCase.execute(query)).rejects.toThrow(SkillNotFoundError);
      expect(findShareByEntityUseCase.execute).toHaveBeenCalled();
    });

    it('should throw SkillNotFoundError when share exists but skill cannot be fetched by ID', async () => {
      const query = new ListSkillSourcesQuery(mockSkillId);
      skillRepository.findOne.mockResolvedValue(null);
      findShareByEntityUseCase.execute.mockResolvedValue({} as any);
      skillRepository.findByIds.mockResolvedValue([]); // Skill deleted?

      await expect(useCase.execute(query)).rejects.toThrow(SkillNotFoundError);
    });

    it('should wrap unexpected errors in UnexpectedSkillError', async () => {
      const query = new ListSkillSourcesQuery(mockSkillId);
      skillRepository.findOne.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(useCase.execute(query)).rejects.toThrow(
        UnexpectedSkillError,
      );
    });

    it('should rethrow ApplicationError without wrapping', async () => {
      const query = new ListSkillSourcesQuery(mockSkillId);
      const appError = new SkillNotFoundError(mockSkillId);
      skillRepository.findOne.mockRejectedValue(appError);

      await expect(useCase.execute(query)).rejects.toThrow(appError);
    });
  });
});
