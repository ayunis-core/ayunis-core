import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ListSkillMcpIntegrationsUseCase } from './list-skill-mcp-integrations.use-case';
import { ListSkillMcpIntegrationsQuery } from './list-skill-mcp-integrations.query';
import { SkillRepository } from '../../ports/skill.repository';
import { GetMcpIntegrationsByIdsUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { Skill } from '../../../domain/skill.entity';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import type { UUID } from 'crypto';
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';

describe('ListSkillMcpIntegrationsUseCase', () => {
  let useCase: ListSkillMcpIntegrationsUseCase;
  let skillRepository: jest.Mocked<SkillRepository>;
  let getMcpIntegrationsByIdsUseCase: jest.Mocked<GetMcpIntegrationsByIdsUseCase>;
  let contextService: jest.Mocked<ContextService>;
  let findShareByEntityUseCase: jest.Mocked<FindShareByEntityUseCase>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockSkillId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174003' as UUID;
  const mockIntegrationId1 = '123e4567-e89b-12d3-a456-426614174010' as UUID;
  const mockIntegrationId2 = '123e4567-e89b-12d3-a456-426614174011' as UUID;

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

    const mockGetMcpIntegrationsByIdsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetMcpIntegrationsByIdsUseCase>;

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
        ListSkillMcpIntegrationsUseCase,
        { provide: SkillRepository, useValue: mockSkillRepository },
        {
          provide: GetMcpIntegrationsByIdsUseCase,
          useValue: mockGetMcpIntegrationsByIdsUseCase,
        },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: FindShareByEntityUseCase,
          useValue: mockFindShareByEntityUseCase,
        },
      ],
    }).compile();

    useCase = module.get(ListSkillMcpIntegrationsUseCase);
    skillRepository = module.get(SkillRepository);
    getMcpIntegrationsByIdsUseCase = module.get(GetMcpIntegrationsByIdsUseCase);
    contextService = module.get(ContextService);
    findShareByEntityUseCase = module.get(FindShareByEntityUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockSkill = (mcpIntegrationIds: UUID[] = []): Skill => {
    return new Skill({
      id: mockSkillId,
      name: 'Test Skill',
      shortDescription: 'A test skill',
      instructions: 'Test instructions',
      mcpIntegrationIds,
      userId: mockUserId,
    });
  };

  const createMockIntegration = (
    id: UUID,
    name: string,
  ): PredefinedMcpIntegration => {
    return new PredefinedMcpIntegration({
      id,
      name,
      orgId: mockOrgId,
      slug: PredefinedMcpIntegrationSlug.TEST,
      serverUrl: 'http://test.example.com',
      auth: new NoAuthMcpIntegrationAuth({}),
      enabled: true,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    });
  };

  describe('execute', () => {
    it('should return MCP integrations for an owned skill', async () => {
      const query = new ListSkillMcpIntegrationsQuery(mockSkillId);
      const mockSkill = createMockSkill([
        mockIntegrationId1,
        mockIntegrationId2,
      ]);
      const mockIntegration1 = createMockIntegration(
        mockIntegrationId1,
        'GitHub Integration',
      );
      const mockIntegration2 = createMockIntegration(
        mockIntegrationId2,
        'Slack Integration',
      );

      skillRepository.findOne.mockResolvedValue(mockSkill);
      getMcpIntegrationsByIdsUseCase.execute.mockResolvedValue([
        mockIntegration1,
        mockIntegration2,
      ]);

      const result = await useCase.execute(query);

      expect(skillRepository.findOne).toHaveBeenCalledWith(
        mockSkillId,
        mockUserId,
      );
      expect(findShareByEntityUseCase.execute).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockIntegration1);
      expect(result[1]).toBe(mockIntegration2);
    });

    it('should return MCP integrations for a shared skill when user does not own it', async () => {
      const query = new ListSkillMcpIntegrationsQuery(mockSkillId);
      const otherUserId = '123e4567-e89b-12d3-a456-426614174099' as UUID;
      const mockSkill = createMockSkill([mockIntegrationId1]);
      Object.defineProperty(mockSkill, 'userId', { value: otherUserId });
      const mockIntegration1 = createMockIntegration(
        mockIntegrationId1,
        'Shared Integration',
      );

      skillRepository.findOne.mockResolvedValue(null);
      findShareByEntityUseCase.execute.mockResolvedValue({} as any);
      skillRepository.findByIds.mockResolvedValue([mockSkill]);
      getMcpIntegrationsByIdsUseCase.execute.mockResolvedValue([
        mockIntegration1,
      ]);

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
      expect(result[0]).toBe(mockIntegration1);
    });

    it('should return empty array when skill has no MCP integrations', async () => {
      const query = new ListSkillMcpIntegrationsQuery(mockSkillId);
      const mockSkill = createMockSkill([]);

      skillRepository.findOne.mockResolvedValue(mockSkill);

      const result = await useCase.execute(query);

      expect(getMcpIntegrationsByIdsUseCase.execute).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      const query = new ListSkillMcpIntegrationsQuery(mockSkillId);
      contextService.get.mockReturnValue(null);

      await expect(useCase.execute(query)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(skillRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw SkillNotFoundError when skill is not owned and not shared', async () => {
      const query = new ListSkillMcpIntegrationsQuery(mockSkillId);
      skillRepository.findOne.mockResolvedValue(null);
      findShareByEntityUseCase.execute.mockResolvedValue(null);

      await expect(useCase.execute(query)).rejects.toThrow(SkillNotFoundError);
      expect(findShareByEntityUseCase.execute).toHaveBeenCalled();
    });

    it('should throw SkillNotFoundError when share exists but skill cannot be fetched by ID', async () => {
      const query = new ListSkillMcpIntegrationsQuery(mockSkillId);
      skillRepository.findOne.mockResolvedValue(null);
      findShareByEntityUseCase.execute.mockResolvedValue({} as any);
      skillRepository.findByIds.mockResolvedValue([]);

      await expect(useCase.execute(query)).rejects.toThrow(SkillNotFoundError);
    });

    it('should wrap unexpected errors in UnexpectedSkillError', async () => {
      const query = new ListSkillMcpIntegrationsQuery(mockSkillId);
      skillRepository.findOne.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(useCase.execute(query)).rejects.toThrow(
        UnexpectedSkillError,
      );
    });

    it('should rethrow ApplicationError without wrapping', async () => {
      const query = new ListSkillMcpIntegrationsQuery(mockSkillId);
      const appError = new SkillNotFoundError(mockSkillId);
      skillRepository.findOne.mockRejectedValue(appError);

      await expect(useCase.execute(query)).rejects.toThrow(appError);
    });
  });
});
