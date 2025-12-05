import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { randomUUID, UUID } from 'crypto';

import { UnassignMcpIntegrationFromAgentUseCase } from './unassign-mcp-integration-from-agent.use-case';
import { UnassignMcpIntegrationFromAgentCommand } from './unassign-mcp-integration-from-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Agent } from '../../../domain/agent.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import {
  AgentNotFoundError,
  UnexpectedAgentError,
  McpIntegrationNotAssignedError,
} from '../../agents.errors';

describe('UnassignMcpIntegrationFromAgentUseCase', () => {
  let useCase: UnassignMcpIntegrationFromAgentUseCase;
  let agentRepository: jest.Mocked<AgentRepository>;
  let contextService: jest.Mocked<ContextService>;

  const mockUserId = randomUUID();
  const mockAgentId = randomUUID();
  const mockIntegrationId1 = randomUUID();
  const mockIntegrationId2 = randomUUID();

  beforeEach(async () => {
    const mockAgentRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAllByModel: jest.fn(),
      updateModel: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnassignMcpIntegrationFromAgentUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<UnassignMcpIntegrationFromAgentUseCase>(
      UnassignMcpIntegrationFromAgentUseCase,
    );
    agentRepository = module.get(AgentRepository);
    contextService = module.get(ContextService);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const createMockAgent = (mcpIntegrationIds: UUID[] = []) => {
      const mockModel = new PermittedLanguageModel({
        id: randomUUID(),
        orgId: randomUUID(),
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

      return new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [],
        userId: mockUserId,
        mcpIntegrationIds,
      });
    };

    it('should successfully unassign an integration when all validations pass', async () => {
      // Arrange
      const command = new UnassignMcpIntegrationFromAgentCommand(
        mockAgentId,
        mockIntegrationId1,
      );

      const mockAgent = createMockAgent([mockIntegrationId1]);
      const updatedAgent = createMockAgent([]);

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      agentRepository.update.mockResolvedValue(updatedAgent);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockAgentId,
          mcpIntegrationIds: [],
        }),
      );
      expect(result).toEqual(updatedAgent);
      expect(result.mcpIntegrationIds).toEqual([]);
    });

    it('should throw UnauthorizedException when user not authenticated', async () => {
      // Arrange
      const command = new UnassignMcpIntegrationFromAgentCommand(
        mockAgentId,
        mockIntegrationId1,
      );

      contextService.get.mockReturnValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).not.toHaveBeenCalled();
      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AgentNotFoundError when agent does not exist', async () => {
      // Arrange
      const command = new UnassignMcpIntegrationFromAgentCommand(
        mockAgentId,
        mockIntegrationId1,
      );

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        AgentNotFoundError,
      );
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw AgentNotFoundError when agent exists but user does not own it', async () => {
      // Arrange
      const command = new UnassignMcpIntegrationFromAgentCommand(
        mockAgentId,
        mockIntegrationId1,
      );

      contextService.get.mockReturnValue(mockUserId);
      // Repository returns null when user doesn't own the agent
      agentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        AgentNotFoundError,
      );
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw McpIntegrationNotAssignedError when integration not currently assigned', async () => {
      // Arrange
      const command = new UnassignMcpIntegrationFromAgentCommand(
        mockAgentId,
        mockIntegrationId1,
      );

      const mockAgent = createMockAgent([]); // Empty integration list

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        McpIntegrationNotAssignedError,
      );
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should wrap unexpected errors in UnexpectedAgentError', async () => {
      // Arrange
      const command = new UnassignMcpIntegrationFromAgentCommand(
        mockAgentId,
        mockIntegrationId1,
      );

      const repositoryError = new Error('Database connection failed');

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedAgentError,
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Unexpected error unassigning MCP integration',
        expect.objectContaining({
          error: repositoryError,
        }),
      );
    });

    it('should remove only the specified integration ID from the array', async () => {
      // Arrange
      const command = new UnassignMcpIntegrationFromAgentCommand(
        mockAgentId,
        mockIntegrationId1,
      );

      const mockAgent = createMockAgent([
        mockIntegrationId1,
        mockIntegrationId2,
      ]);
      const updatedAgent = createMockAgent([mockIntegrationId2]);

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      agentRepository.update.mockResolvedValue(updatedAgent);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockAgentId,
          mcpIntegrationIds: [mockIntegrationId2],
        }),
      );
      expect(result.mcpIntegrationIds).toEqual([mockIntegrationId2]);
      expect(result.mcpIntegrationIds).toHaveLength(1);
    });

    it('should save the updated agent via repository', async () => {
      // Arrange
      const command = new UnassignMcpIntegrationFromAgentCommand(
        mockAgentId,
        mockIntegrationId1,
      );

      const mockAgent = createMockAgent([mockIntegrationId1]);
      const updatedAgent = createMockAgent([]);

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      agentRepository.update.mockResolvedValue(updatedAgent);

      // Act
      await useCase.execute(command);

      // Assert
      expect(agentRepository.update).toHaveBeenCalledTimes(1);
      expect(agentRepository.update).toHaveBeenCalledWith(expect.any(Agent));
    });

    it('should rethrow ApplicationError instances without wrapping', async () => {
      // Arrange
      const command = new UnassignMcpIntegrationFromAgentCommand(
        mockAgentId,
        mockIntegrationId1,
      );

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockRejectedValue(
        new AgentNotFoundError(mockAgentId),
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        AgentNotFoundError,
      );
      expect(Logger.prototype.error).not.toHaveBeenCalled();
    });

    it('should rethrow UnauthorizedException without wrapping', async () => {
      // Arrange
      const command = new UnassignMcpIntegrationFromAgentCommand(
        mockAgentId,
        mockIntegrationId1,
      );

      const authError = new UnauthorizedException('Not authenticated');

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockRejectedValue(authError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(Logger.prototype.error).not.toHaveBeenCalled();
    });

    it('should log the operation with correct parameters', async () => {
      // Arrange
      const command = new UnassignMcpIntegrationFromAgentCommand(
        mockAgentId,
        mockIntegrationId1,
      );

      const mockAgent = createMockAgent([mockIntegrationId1]);
      const updatedAgent = createMockAgent([]);

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      agentRepository.update.mockResolvedValue(updatedAgent);

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        'Unassigning MCP integration from agent',
        {
          agentId: mockAgentId,
          integrationId: mockIntegrationId1,
        },
      );
    });
  });
});
