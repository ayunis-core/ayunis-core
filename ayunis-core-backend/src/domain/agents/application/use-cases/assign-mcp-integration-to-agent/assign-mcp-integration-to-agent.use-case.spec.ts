import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AssignMcpIntegrationToAgentUseCase } from './assign-mcp-integration-to-agent.use-case';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { AssignMcpIntegrationToAgentCommand } from './assign-mcp-integration-to-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import {
  AgentNotFoundError,
  McpIntegrationNotFoundError,
  McpIntegrationAlreadyAssignedError,
  McpIntegrationDisabledError,
  McpIntegrationWrongOrganizationError,
  UnexpectedAgentError,
} from '../../agents.errors';
import { Agent } from '../../../domain/agent.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PredefinedMcpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import { NoAuthMcpIntegrationAuth } from 'src/domain/mcp/domain/auth/no-auth-mcp-integration-auth.entity';
import { UUID } from 'crypto';

describe('AssignMcpIntegrationToAgentUseCase', () => {
  let useCase: AssignMcpIntegrationToAgentUseCase;
  let agentRepository: jest.Mocked<AgentRepository>;
  let mcpIntegrationsRepository: jest.Mocked<McpIntegrationsRepositoryPort>;
  let contextService: jest.Mocked<ContextService>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockAgentId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockIntegrationId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174003' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174004' as UUID;
  const mockOtherOrgId = '123e4567-e89b-12d3-a456-426614174005' as UUID;

  let mockModel: PermittedLanguageModel;
  let mockIntegration: PredefinedMcpIntegration;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockAgentRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      findAllByModel: jest.fn(),
      updateModel: jest.fn(),
    };

    const mockMcpIntegrationsRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByIds: jest.fn(),
      findByOrganizationId: jest.fn(),
      findByOrganizationIdAndEnabled: jest.fn(),
      findByOrgIdAndSlug: jest.fn(),
      delete: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignMcpIntegrationToAgentUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
        {
          provide: McpIntegrationsRepositoryPort,
          useValue: mockMcpIntegrationsRepository,
        },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<AssignMcpIntegrationToAgentUseCase>(
      AssignMcpIntegrationToAgentUseCase,
    );
    agentRepository = module.get(AgentRepository);
    mcpIntegrationsRepository = module.get(McpIntegrationsRepositoryPort);
    contextService = module.get(ContextService);

    // Mock logger methods
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Create mock entities
    mockModel = new PermittedLanguageModel({
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
        canVision: false,
      }),
    });

    mockIntegration = new PredefinedMcpIntegration({
      id: mockIntegrationId,
      name: 'Test MCP Integration',
      orgId: mockOrgId,
      slug: PredefinedMcpIntegrationSlug.TEST,
      serverUrl: 'http://test.example.com',
      auth: new NoAuthMcpIntegrationAuth({}),
      enabled: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should assign MCP integration to agent successfully when all validations pass', async () => {
      // Arrange
      const command = new AssignMcpIntegrationToAgentCommand(
        mockAgentId,
        mockIntegrationId,
      );

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        mcpIntegrationIds: [],
      });

      const updatedMockAgent = new Agent({
        ...mockAgent,
        mcpIntegrationIds: [mockIntegrationId],
      });

      contextService.get.mockImplementation((key) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });
      agentRepository.findOne.mockResolvedValue(mockAgent);
      mcpIntegrationsRepository.findById.mockResolvedValue(mockIntegration);
      agentRepository.update.mockResolvedValue(updatedMockAgent);

      // Act
      const result = await useCase.execute(command);

      // Assert

      expect(contextService.get).toHaveBeenCalledWith('userId');

      expect(contextService.get).toHaveBeenCalledWith('orgId');

      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );

      expect(mcpIntegrationsRepository.findById).toHaveBeenCalledWith(
        mockIntegrationId,
      );

      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockAgentId,
          mcpIntegrationIds: [mockIntegrationId],
        }),
      );
      expect(result).toBeInstanceOf(Agent);
      expect(result.mcpIntegrationIds).toContain(mockIntegrationId);
      expect(logSpy).toHaveBeenCalledWith(
        'Assigning MCP integration to agent',
        {
          agentId: mockAgentId,
          integrationId: mockIntegrationId,
        },
      );
    });

    it('should add integration to existing mcpIntegrationIds array', async () => {
      // Arrange
      const existingIntegrationId =
        '123e4567-e89b-12d3-a456-426614174006' as UUID;
      const command = new AssignMcpIntegrationToAgentCommand(
        mockAgentId,
        mockIntegrationId,
      );

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        mcpIntegrationIds: [existingIntegrationId],
      });

      const updatedMockAgent = new Agent({
        ...mockAgent,
        mcpIntegrationIds: [existingIntegrationId, mockIntegrationId],
      });

      contextService.get.mockImplementation((key) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });
      agentRepository.findOne.mockResolvedValue(mockAgent);
      mcpIntegrationsRepository.findById.mockResolvedValue(mockIntegration);
      agentRepository.update.mockResolvedValue(updatedMockAgent);

      // Act
      const result = await useCase.execute(command);

      // Assert

      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          mcpIntegrationIds: [existingIntegrationId, mockIntegrationId],
        }),
      );
      expect(result.mcpIntegrationIds).toEqual([
        existingIntegrationId,
        mockIntegrationId,
      ]);
    });

    it('should throw UnauthorizedAccessError when user is not authenticated', async () => {
      // Arrange
      const command = new AssignMcpIntegrationToAgentCommand(
        mockAgentId,
        mockIntegrationId,
      );

      contextService.get.mockReturnValue(null); // No user ID

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedAccessError,
      );

      expect(contextService.get).toHaveBeenCalledWith('userId');

      expect(agentRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw AgentNotFoundError when agent does not exist', async () => {
      // Arrange
      const command = new AssignMcpIntegrationToAgentCommand(
        mockAgentId,
        mockIntegrationId,
      );

      contextService.get.mockImplementation((key) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });
      agentRepository.findOne.mockResolvedValue(null); // Agent not found

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        AgentNotFoundError,
      );

      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );

      expect(mcpIntegrationsRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw AgentNotFoundError when agent exists but user does not own it', async () => {
      // Arrange
      const command = new AssignMcpIntegrationToAgentCommand(
        mockAgentId,
        mockIntegrationId,
      );

      contextService.get.mockImplementation((key) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });
      // Repository returns null when user doesn't own agent
      agentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        AgentNotFoundError,
      );

      expect(mcpIntegrationsRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationNotFoundError when integration does not exist', async () => {
      // Arrange
      const command = new AssignMcpIntegrationToAgentCommand(
        mockAgentId,
        mockIntegrationId,
      );

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        mcpIntegrationIds: [],
      });

      contextService.get.mockImplementation((key) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });
      agentRepository.findOne.mockResolvedValue(mockAgent);
      mcpIntegrationsRepository.findById.mockResolvedValue(null); // Integration not found

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationNotFoundError,
      );

      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationDisabledError when integration is disabled', async () => {
      // Arrange
      const command = new AssignMcpIntegrationToAgentCommand(
        mockAgentId,
        mockIntegrationId,
      );

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        mcpIntegrationIds: [],
      });

      const disabledIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Disabled Integration',
        orgId: mockOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://test.example.com',
        auth: new NoAuthMcpIntegrationAuth({}),
        enabled: false,
      });

      contextService.get.mockImplementation((key) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });
      agentRepository.findOne.mockResolvedValue(mockAgent);
      mcpIntegrationsRepository.findById.mockResolvedValue(disabledIntegration);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationDisabledError,
      );

      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationWrongOrganizationError when integration belongs to different organization', async () => {
      // Arrange
      const command = new AssignMcpIntegrationToAgentCommand(
        mockAgentId,
        mockIntegrationId,
      );

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        mcpIntegrationIds: [],
      });

      const otherOrgIntegration = new PredefinedMcpIntegration({
        id: mockIntegrationId,
        name: 'Other Org Integration',
        orgId: mockOtherOrgId,
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://test.example.com',
        auth: new NoAuthMcpIntegrationAuth({}),
        enabled: true,
      });

      contextService.get.mockImplementation((key) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });
      agentRepository.findOne.mockResolvedValue(mockAgent);
      mcpIntegrationsRepository.findById.mockResolvedValue(otherOrgIntegration);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationWrongOrganizationError,
      );

      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationAlreadyAssignedError when integration is already assigned', async () => {
      // Arrange
      const command = new AssignMcpIntegrationToAgentCommand(
        mockAgentId,
        mockIntegrationId,
      );

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        mcpIntegrationIds: [mockIntegrationId], // Already assigned
      });

      contextService.get.mockImplementation((key) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });
      agentRepository.findOne.mockResolvedValue(mockAgent);
      mcpIntegrationsRepository.findById.mockResolvedValue(mockIntegration);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationAlreadyAssignedError,
      );

      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw UnexpectedAgentError when repository throws unexpected error', async () => {
      // Arrange
      const command = new AssignMcpIntegrationToAgentCommand(
        mockAgentId,
        mockIntegrationId,
      );

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        mcpIntegrationIds: [],
      });

      const repositoryError = new Error('Database connection failed');

      contextService.get.mockImplementation((key) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });
      agentRepository.findOne.mockResolvedValue(mockAgent);
      mcpIntegrationsRepository.findById.mockResolvedValue(mockIntegration);
      agentRepository.update.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedAgentError,
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Unexpected error assigning MCP integration',
        {
          error: repositoryError,
        },
      );
    });

    it('should re-throw ApplicationError without wrapping', async () => {
      // Arrange
      const command = new AssignMcpIntegrationToAgentCommand(
        mockAgentId,
        mockIntegrationId,
      );

      const agentNotFoundError = new AgentNotFoundError(mockAgentId);

      contextService.get.mockImplementation((key) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });
      agentRepository.findOne.mockRejectedValue(agentNotFoundError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        AgentNotFoundError,
      );
      expect(errorSpy).not.toHaveBeenCalled(); // Should not log ApplicationErrors
    });

    it('should save updated agent with integration ID added to mcpIntegrationIds array', async () => {
      // Arrange
      const command = new AssignMcpIntegrationToAgentCommand(
        mockAgentId,
        mockIntegrationId,
      );

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        mcpIntegrationIds: [],
      });

      contextService.get.mockImplementation((key) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return null;
      });
      agentRepository.findOne.mockResolvedValue(mockAgent);
      mcpIntegrationsRepository.findById.mockResolvedValue(mockIntegration);
      agentRepository.update.mockImplementation((agent: Agent) =>
        Promise.resolve(agent),
      );

      // Act
      await useCase.execute(command);

      // Assert

      expect(agentRepository.update).toHaveBeenCalledTimes(1);

      const savedAgent = (agentRepository.update as jest.Mock).mock
        .calls[0][0] as Agent;
      expect(savedAgent.mcpIntegrationIds).toContain(mockIntegrationId);
      expect(savedAgent.mcpIntegrationIds.length).toBe(1);
    });
  });
});
