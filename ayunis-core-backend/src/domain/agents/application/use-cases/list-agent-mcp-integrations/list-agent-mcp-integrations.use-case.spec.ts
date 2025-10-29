import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ListAgentMcpIntegrationsUseCase } from './list-agent-mcp-integrations.use-case';
import { ListAgentMcpIntegrationsQuery } from './list-agent-mcp-integrations.query';
import { AgentRepository } from '../../ports/agent.repository';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { Agent } from '../../../domain/agent.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ContextService } from 'src/common/context/services/context.service';
import {
  AgentNotFoundError,
  UnexpectedAgentError,
} from '../../../application/agents.errors';
import { UUID } from 'crypto';
import {
  McpIntegration,
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from 'src/domain/mcp/domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from 'src/domain/mcp/domain/mcp-auth-method.enum';

describe('ListAgentMcpIntegrationsUseCase', () => {
  let useCase: ListAgentMcpIntegrationsUseCase;
  let agentsRepository: jest.Mocked<AgentRepository>;
  let mcpIntegrationsRepository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let contextService: jest.Mocked<ContextService>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockAgentId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174003' as UUID;
  const mockIntegration1Id = '123e4567-e89b-12d3-a456-426614174010' as UUID;
  const mockIntegration2Id = '123e4567-e89b-12d3-a456-426614174011' as UUID;

  beforeEach(async () => {
    const mockAgentsRepository = {
      create: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      findAllByModel: jest.fn(),
      update: jest.fn(),
      updateModel: jest.fn(),
    } as jest.Mocked<AgentRepository>;

    const mockMcpIntegrationsRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAll: jest.fn(),
      findByOrganizationId: jest.fn(),
      findByOrganizationIdAndEnabled: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<McpIntegrationsRepositoryPort>;

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAgentMcpIntegrationsUseCase,
        { provide: AgentRepository, useValue: mockAgentsRepository },
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: mockMcpIntegrationsRepository,
        },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<ListAgentMcpIntegrationsUseCase>(
      ListAgentMcpIntegrationsUseCase,
    );
    agentsRepository = module.get(AgentRepository);
    mcpIntegrationsRepository = module.get(McpIntegrationsRepositoryPort);
    contextService = module.get(ContextService);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockModel = (): PermittedLanguageModel => {
    return new PermittedLanguageModel({
      id: mockModelId,
      orgId: mockOrgId,
      model: new LanguageModel({
        name: 'gpt-4',
        displayName: 'GPT-4',
        provider: ModelProvider.OPENAI,
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: false,
      }),
    });
  };

  const createMockAgent = (mcpIntegrationIds: string[] = []): Agent => {
    return new Agent({
      id: mockAgentId,
      name: 'Test Agent',
      instructions: 'Test instructions',
      model: createMockModel(),
      toolAssignments: [],
      sourceAssignments: [],
      userId: mockUserId,
      mcpIntegrationIds,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    });
  };

  const createMockPredefinedIntegration = (
    id: UUID,
    name: string,
    slug: PredefinedMcpIntegrationSlug,
  ): PredefinedMcpIntegration => {
    return new PredefinedMcpIntegration(
      id,
      name,
      mockOrgId,
      slug,
      true,
      undefined,
      undefined,
      undefined,
      new Date('2024-01-01T00:00:00Z'),
      new Date('2024-01-01T00:00:00Z'),
    );
  };

  const createMockCustomIntegration = (
    id: UUID,
    name: string,
    serverUrl: string,
  ): CustomMcpIntegration => {
    return new CustomMcpIntegration(
      id,
      name,
      mockOrgId,
      serverUrl,
      true,
      McpAuthMethod.BEARER_TOKEN,
      'Authorization',
      'encrypted-credentials',
      new Date('2024-01-01T00:00:00Z'),
      new Date('2024-01-01T00:00:00Z'),
    );
  };

  describe('execute', () => {
    it('should return array of full integration entities when agent has assigned integrations', async () => {
      // Arrange
      const query = new ListAgentMcpIntegrationsQuery(mockAgentId);
      const mockAgent = createMockAgent([
        mockIntegration1Id,
        mockIntegration2Id,
      ]);
      const mockIntegration1 = createMockPredefinedIntegration(
        mockIntegration1Id,
        'GitHub Integration',
        PredefinedMcpIntegrationSlug.TEST,
      );
      const mockIntegration2 = createMockCustomIntegration(
        mockIntegration2Id,
        'Custom Integration',
        'https://example.com/mcp',
      );

      agentsRepository.findOne.mockResolvedValue(mockAgent);
      mcpIntegrationsRepository.findById
        .mockResolvedValueOnce(mockIntegration1)
        .mockResolvedValueOnce(mockIntegration2);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentsRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(mcpIntegrationsRepository.findById).toHaveBeenCalledTimes(2);
      expect(mcpIntegrationsRepository.findById).toHaveBeenCalledWith(
        mockIntegration1Id,
      );
      expect(mcpIntegrationsRepository.findById).toHaveBeenCalledWith(
        mockIntegration2Id,
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockIntegration1);
      expect(result[1]).toBe(mockIntegration2);
    });

    it('should return empty array when agent has no assigned integrations', async () => {
      // Arrange
      const query = new ListAgentMcpIntegrationsQuery(mockAgentId);
      const mockAgent = createMockAgent([]); // No integrations

      agentsRepository.findOne.mockResolvedValue(mockAgent);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentsRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(mcpIntegrationsRepository.findById).not.toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      // Arrange
      const query = new ListAgentMcpIntegrationsQuery(mockAgentId);
      contextService.get.mockReturnValue(null); // No userId in context

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(useCase.execute(query)).rejects.toThrow(
        'User not authenticated',
      );

      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentsRepository.findOne).not.toHaveBeenCalled();
      expect(mcpIntegrationsRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw AgentNotFoundError when agent does not exist', async () => {
      // Arrange
      const query = new ListAgentMcpIntegrationsQuery(mockAgentId);
      agentsRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(AgentNotFoundError);
      await expect(useCase.execute(query)).rejects.toThrow(
        `Agent with ID ${mockAgentId} not found`,
      );

      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentsRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(mcpIntegrationsRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw AgentNotFoundError when agent exists but user does not own it', async () => {
      // Arrange
      const query = new ListAgentMcpIntegrationsQuery(mockAgentId);
      agentsRepository.findOne.mockResolvedValue(null); // Repository returns null when user doesn't own agent

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(AgentNotFoundError);
      await expect(useCase.execute(query)).rejects.toThrow(
        `Agent with ID ${mockAgentId} not found`,
      );

      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentsRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
    });

    it('should filter out null values if integration IDs reference deleted integrations', async () => {
      // Arrange
      const query = new ListAgentMcpIntegrationsQuery(mockAgentId);
      const mockAgent = createMockAgent([
        mockIntegration1Id,
        mockIntegration2Id,
      ]);
      const mockIntegration1 = createMockPredefinedIntegration(
        mockIntegration1Id,
        'GitHub Integration',
        PredefinedMcpIntegrationSlug.TEST,
      );

      agentsRepository.findOne.mockResolvedValue(mockAgent);
      mcpIntegrationsRepository.findById
        .mockResolvedValueOnce(mockIntegration1)
        .mockResolvedValueOnce(null); // Second integration was deleted

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentsRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(mcpIntegrationsRepository.findById).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockIntegration1);
    });

    it('should wrap unexpected errors in UnexpectedAgentError', async () => {
      // Arrange
      const query = new ListAgentMcpIntegrationsQuery(mockAgentId);
      const unexpectedError = new Error('Database connection failed');
      agentsRepository.findOne.mockRejectedValue(unexpectedError);

      const logSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnexpectedAgentError,
      );
      await expect(useCase.execute(query)).rejects.toThrow(
        'Unexpected error occurred',
      );

      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentsRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(logSpy).toHaveBeenCalledWith(
        'Unexpected error listing agent MCP integrations',
        {
          error: unexpectedError,
        },
      );
    });

    it('should rethrow ApplicationError when repository throws one', async () => {
      // Arrange
      const query = new ListAgentMcpIntegrationsQuery(mockAgentId);
      const applicationError = new AgentNotFoundError(mockAgentId);
      agentsRepository.findOne.mockRejectedValue(applicationError);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(applicationError);

      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentsRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
    });

    it('should rethrow UnauthorizedException without wrapping', async () => {
      // Arrange
      const query = new ListAgentMcpIntegrationsQuery(mockAgentId);
      const authError = new UnauthorizedException('Token expired');
      agentsRepository.findOne.mockRejectedValue(authError);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(authError);
      await expect(useCase.execute(query)).rejects.toThrow('Token expired');

      expect(contextService.get).toHaveBeenCalledWith('userId');
    });

    it('should log the query execution', async () => {
      // Arrange
      const query = new ListAgentMcpIntegrationsQuery(mockAgentId);
      const mockAgent = createMockAgent([]);

      agentsRepository.findOne.mockResolvedValue(mockAgent);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(query);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        'Listing MCP integrations for agent',
        {
          agentId: mockAgentId,
        },
      );
    });
  });
});
