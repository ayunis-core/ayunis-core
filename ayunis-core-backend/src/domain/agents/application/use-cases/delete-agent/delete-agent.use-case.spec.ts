import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { DeleteAgentUseCase } from './delete-agent.use-case';
import { AgentRepository } from '../../ports/agent.repository';
import { DeleteAgentCommand } from './delete-agent.command';
import { Agent } from '../../../domain/agent.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { AgentNotFoundError } from '../../agents.errors';
import { randomUUID } from 'crypto';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

describe('DeleteAgentUseCase', () => {
  let useCase: DeleteAgentUseCase;
  let mockAgentRepository: Partial<AgentRepository>;
  let mockContextService: { get: jest.Mock };

  const userId = randomUUID();
  const orgId = randomUUID();

  beforeAll(async () => {
    mockAgentRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      delete: jest.fn(),
    };

    mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return userId;
        if (key === 'orgId') return orgId;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteAgentUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<DeleteAgentUseCase>(DeleteAgentUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextService.get.mockImplementation((key: string) => {
      if (key === 'userId') return userId;
      if (key === 'orgId') return orgId;
      return undefined;
    });
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should delete the agent successfully', async () => {
      // Arrange
      const agentId = randomUUID();
      const command = new DeleteAgentCommand({ agentId });

      const mockModel = new PermittedLanguageModel({
        id: randomUUID(),
        orgId: randomUUID(),
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
          canUseTools: true,
          canVision: false,
        }),
      });
      const existingAgent = new Agent({
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        userId,
      });

      jest
        .spyOn(mockAgentRepository, 'findOne')
        .mockResolvedValue(existingAgent);
      jest.spyOn(mockAgentRepository, 'delete').mockResolvedValue();

      // Act
      await useCase.execute(command);

      // Assert
      expect(mockAgentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
      expect(mockAgentRepository.delete).toHaveBeenCalledWith(agentId, userId);
    });

    it('should throw UnauthorizedAccessError when user is not authenticated', async () => {
      // Arrange
      const agentId = randomUUID();
      const command = new DeleteAgentCommand({ agentId });
      mockContextService.get.mockReturnValue(undefined);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedAccessError,
      );
      expect(mockAgentRepository.findOne).not.toHaveBeenCalled();
      expect(mockAgentRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw AgentNotFoundError when agent does not exist', async () => {
      // Arrange
      const agentId = randomUUID();
      const command = new DeleteAgentCommand({ agentId });

      jest.spyOn(mockAgentRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        AgentNotFoundError,
      );
      expect(mockAgentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
      expect(mockAgentRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle repository delete errors', async () => {
      // Arrange
      const agentId = randomUUID();
      const command = new DeleteAgentCommand({ agentId });

      const mockModel = new PermittedLanguageModel({
        id: randomUUID(),
        orgId: randomUUID(),
        model: new LanguageModel({
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
          canUseTools: true,
          canVision: false,
        }),
      });
      const existingAgent = new Agent({
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        userId,
      });

      const deleteError = new Error('Database delete failed');
      jest
        .spyOn(mockAgentRepository, 'findOne')
        .mockResolvedValue(existingAgent);
      jest.spyOn(mockAgentRepository, 'delete').mockRejectedValue(deleteError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Unexpected error occurred',
      );
      expect(mockAgentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
      expect(mockAgentRepository.delete).toHaveBeenCalledWith(agentId, userId);
    });
  });
});
