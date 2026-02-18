import { Test, TestingModule } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { UnauthorizedException, Logger } from '@nestjs/common';
import { UpdateAgentUseCase } from './update-agent.use-case';
import { UpdateAgentCommand } from './update-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { Agent } from '../../../domain/agent.entity';
import { AgentToolAssignment } from '../../../domain/agent-tool-assignment.entity';
import { AgentSourceAssignment } from '../../../domain/agent-source-assignment.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { AgentNotFoundError } from '../../agents.errors';
import { randomUUID, UUID } from 'crypto';

describe('UpdateAgentUseCase', () => {
  let useCase: UpdateAgentUseCase;
  let agentRepository: jest.Mocked<AgentRepository>;
  let getPermittedLanguageModelUseCase: jest.Mocked<GetPermittedLanguageModelUseCase>;
  let mockContextService: { get: jest.Mock };

  const mockUserId = randomUUID();
  const mockOrgId = randomUUID();
  const mockModelId = randomUUID();
  const mockAgentId = randomUUID();

  const createMockModel = (id: UUID = mockModelId): PermittedLanguageModel => {
    return new PermittedLanguageModel({
      id,
      orgId: mockOrgId,
      model: new LanguageModel({
        name: 'gpt-4',
        displayName: 'GPT-4',
        provider: ModelProvider.OPENAI,
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: true,
        canVision: true,
      }),
    });
  };

  const createMockTool = (type: ToolType = ToolType.INTERNET_SEARCH) => ({
    type,
    name: type.toLowerCase(),
    description: `Mock ${type} tool`,
    parameters: { type: 'object', properties: {} },
    validateParams: (p: any) => p,
  });

  const createMockSource = () => ({
    id: randomUUID(),
    name: 'Test Source',
    type: 'file',
  });

  beforeEach(async () => {
    const mockAgentRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockGetPermittedLanguageModelUseCase = {
      execute: jest.fn(),
    };

    mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateAgentUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
        {
          provide: GetPermittedLanguageModelUseCase,
          useValue: mockGetPermittedLanguageModelUseCase,
        },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<UpdateAgentUseCase>(UpdateAgentUseCase);
    agentRepository = module.get(AgentRepository);
    getPermittedLanguageModelUseCase = module.get(
      GetPermittedLanguageModelUseCase,
    );

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should update an agent successfully', async () => {
      // Arrange
      const command = new UpdateAgentCommand({
        agentId: mockAgentId,
        name: 'Updated Agent Name',
        instructions: 'Updated instructions',
        modelId: mockModelId,
      });

      const mockModel = createMockModel();
      const existingAgent = new Agent({
        id: mockAgentId,
        name: 'Original Agent Name',
        instructions: 'Original instructions',
        model: mockModel,
        userId: mockUserId,
      });

      const updatedAgent = new Agent({
        id: mockAgentId,
        name: command.name,
        instructions: command.instructions,
        model: mockModel,
        userId: mockUserId,
      });

      agentRepository.findOne.mockResolvedValue(existingAgent);
      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      agentRepository.update.mockResolvedValue(updatedAgent);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(getPermittedLanguageModelUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockModelId }),
      );
      expect(agentRepository.update).toHaveBeenCalledWith(expect.any(Agent));
      expect(result.name).toBe(command.name);
      expect(result.instructions).toBe(command.instructions);
    });

    it('should preserve existing toolAssignments when updating agent details', async () => {
      // Arrange
      const command = new UpdateAgentCommand({
        agentId: mockAgentId,
        name: 'Updated Agent Name',
        instructions: 'Updated instructions',
        modelId: mockModelId,
      });

      const mockModel = createMockModel();
      const mockTool = createMockTool(ToolType.INTERNET_SEARCH);
      const existingToolAssignment = new AgentToolAssignment({
        tool: mockTool as any,
      });

      const existingAgent = new Agent({
        id: mockAgentId,
        name: 'Original Agent Name',
        instructions: 'Original instructions',
        model: mockModel,
        userId: mockUserId,
        toolAssignments: [existingToolAssignment],
      });

      agentRepository.findOne.mockResolvedValue(existingAgent);
      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      agentRepository.update.mockImplementation(async (agent) => agent);

      // Act
      await useCase.execute(command);

      // Assert
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          toolAssignments: [existingToolAssignment],
        }),
      );
    });

    it('should preserve existing sourceAssignments when updating agent details', async () => {
      // Arrange
      const command = new UpdateAgentCommand({
        agentId: mockAgentId,
        name: 'Updated Agent Name',
        instructions: 'Updated instructions',
        modelId: mockModelId,
      });

      const mockModel = createMockModel();
      const mockSource = createMockSource();
      const existingSourceAssignment = new AgentSourceAssignment({
        source: mockSource as any,
      });

      const existingAgent = new Agent({
        id: mockAgentId,
        name: 'Original Agent Name',
        instructions: 'Original instructions',
        model: mockModel,
        userId: mockUserId,
        sourceAssignments: [existingSourceAssignment],
      });

      agentRepository.findOne.mockResolvedValue(existingAgent);
      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      agentRepository.update.mockImplementation(async (agent) => agent);

      // Act
      await useCase.execute(command);

      // Assert
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceAssignments: [existingSourceAssignment],
        }),
      );
    });

    it('should preserve existing mcpIntegrationIds when updating agent details', async () => {
      // Arrange
      const command = new UpdateAgentCommand({
        agentId: mockAgentId,
        name: 'Updated Agent Name',
        instructions: 'Updated instructions',
        modelId: mockModelId,
      });

      const mockModel = createMockModel();
      const existingMcpIntegrationIds = [randomUUID(), randomUUID()];

      const existingAgent = new Agent({
        id: mockAgentId,
        name: 'Original Agent Name',
        instructions: 'Original instructions',
        model: mockModel,
        userId: mockUserId,
        mcpIntegrationIds: existingMcpIntegrationIds,
      });

      agentRepository.findOne.mockResolvedValue(existingAgent);
      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      agentRepository.update.mockImplementation(async (agent) => agent);

      // Act
      await useCase.execute(command);

      // Assert
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          mcpIntegrationIds: existingMcpIntegrationIds,
        }),
      );
    });

    it('should preserve all relationships (toolAssignments, sourceAssignments, mcpIntegrationIds) when updating agent details', async () => {
      // Arrange
      const command = new UpdateAgentCommand({
        agentId: mockAgentId,
        name: 'Updated Agent Name',
        instructions: 'Updated instructions',
        modelId: mockModelId,
      });

      const mockModel = createMockModel();
      const mockTool1 = createMockTool(ToolType.INTERNET_SEARCH);
      const mockTool2 = createMockTool(ToolType.SEND_EMAIL);
      const existingToolAssignments = [
        new AgentToolAssignment({ tool: mockTool1 as any }),
        new AgentToolAssignment({ tool: mockTool2 as any }),
      ];

      const mockSource = createMockSource();
      const existingSourceAssignments = [
        new AgentSourceAssignment({ source: mockSource as any }),
      ];

      const existingMcpIntegrationIds = [randomUUID(), randomUUID()];

      const existingAgent = new Agent({
        id: mockAgentId,
        name: 'Original Agent Name',
        instructions: 'Original instructions',
        model: mockModel,
        userId: mockUserId,
        toolAssignments: existingToolAssignments,
        sourceAssignments: existingSourceAssignments,
        mcpIntegrationIds: existingMcpIntegrationIds,
      });

      agentRepository.findOne.mockResolvedValue(existingAgent);
      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      agentRepository.update.mockImplementation(async (agent) => agent);

      // Act
      const result = await useCase.execute(command);

      // Assert - Verify the agent passed to update has all relationships preserved
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockAgentId,
          name: command.name,
          instructions: command.instructions,
          toolAssignments: existingToolAssignments,
          sourceAssignments: existingSourceAssignments,
          mcpIntegrationIds: existingMcpIntegrationIds,
        }),
      );

      // Also verify result has the preserved relationships
      expect(result.toolAssignments).toEqual(existingToolAssignments);
      expect(result.sourceAssignments).toEqual(existingSourceAssignments);
      expect(result.mcpIntegrationIds).toEqual(existingMcpIntegrationIds);
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      const command = new UpdateAgentCommand({
        agentId: mockAgentId,
        name: 'Updated Agent Name',
        instructions: 'Updated instructions',
        modelId: mockModelId,
      });

      mockContextService.get.mockReturnValue(undefined);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(agentRepository.findOne).not.toHaveBeenCalled();
      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AgentNotFoundError when agent does not exist', async () => {
      // Arrange
      const command = new UpdateAgentCommand({
        agentId: mockAgentId,
        name: 'Updated Agent Name',
        instructions: 'Updated instructions',
        modelId: mockModelId,
      });

      agentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        AgentNotFoundError,
      );
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should preserve createdAt timestamp from existing agent', async () => {
      // Arrange
      const originalCreatedAt = new Date('2024-01-01T00:00:00.000Z');
      const command = new UpdateAgentCommand({
        agentId: mockAgentId,
        name: 'Updated Agent Name',
        instructions: 'Updated instructions',
        modelId: mockModelId,
      });

      const mockModel = createMockModel();
      const existingAgent = new Agent({
        id: mockAgentId,
        name: 'Original Agent Name',
        instructions: 'Original instructions',
        model: mockModel,
        userId: mockUserId,
        createdAt: originalCreatedAt,
      });

      agentRepository.findOne.mockResolvedValue(existingAgent);
      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      agentRepository.update.mockImplementation(async (agent) => agent);

      // Act
      await useCase.execute(command);

      // Assert
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: originalCreatedAt,
        }),
      );
    });

    it('should log the update operation', async () => {
      // Arrange
      const command = new UpdateAgentCommand({
        agentId: mockAgentId,
        name: 'Updated Agent Name',
        instructions: 'Updated instructions',
        modelId: mockModelId,
      });

      const mockModel = createMockModel();
      const existingAgent = new Agent({
        id: mockAgentId,
        name: 'Original Agent Name',
        instructions: 'Original instructions',
        model: mockModel,
        userId: mockUserId,
      });

      agentRepository.findOne.mockResolvedValue(existingAgent);
      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      agentRepository.update.mockImplementation(async (agent) => agent);

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Updating agent', {
        agentId: mockAgentId,
        name: command.name,
        userId: mockUserId,
      });
    });
  });
});
