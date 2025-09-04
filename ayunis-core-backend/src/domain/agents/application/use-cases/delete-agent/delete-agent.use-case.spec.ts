import { Test, TestingModule } from '@nestjs/testing';
import { DeleteAgentUseCase } from './delete-agent.use-case';
import { AgentRepository } from '../../ports/agent.repository';
import { DeleteAgentCommand } from './delete-agent.command';
import { Agent } from '../../../domain/agent.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { AgentNotFoundError } from '../../agents.errors';
import { randomUUID, UUID } from 'crypto';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';

describe('DeleteAgentUseCase', () => {
  let useCase: DeleteAgentUseCase;
  let mockAgentRepository: Partial<AgentRepository>;

  beforeEach(async () => {
    mockAgentRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteAgentUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
        {
          provide:
            require('src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case')
              .ReplaceModelWithUserDefaultUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get<DeleteAgentUseCase>(DeleteAgentUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should delete an agent successfully', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();
      const command = new DeleteAgentCommand({
        agentId,
        userId,
        orgId: randomUUID(),
      });

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

    it('should throw AgentNotFoundError when agent does not exist', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();
      const command = new DeleteAgentCommand({
        agentId,
        userId,
        orgId: randomUUID(),
      });

      jest.spyOn(mockAgentRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        AgentNotFoundError,
      );
      expect(mockAgentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
      expect(mockAgentRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw AgentNotFoundError when agent belongs to different user', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();
      const command = new DeleteAgentCommand({
        agentId,
        userId,
        orgId: randomUUID(),
      });

      // Mock repository to return null (agent not found for this user)
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
      const userId = randomUUID();
      const command = new DeleteAgentCommand({
        agentId,
        userId,
        orgId: randomUUID(),
      });

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
        'Database delete failed',
      );
      expect(mockAgentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
      expect(mockAgentRepository.delete).toHaveBeenCalledWith(agentId, userId);
    });

    it('should handle repository findOne errors', async () => {
      // Arrange
      const agentId = randomUUID();
      const userId = randomUUID();
      const command = new DeleteAgentCommand({
        agentId,
        userId,
        orgId: randomUUID(),
      });

      const findError = new Error('Database connection failed');
      jest.spyOn(mockAgentRepository, 'findOne').mockRejectedValue(findError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockAgentRepository.findOne).toHaveBeenCalledWith(agentId, userId);
      expect(mockAgentRepository.delete).not.toHaveBeenCalled();
    });
  });
});
