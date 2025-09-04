import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';

// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (target: any, propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
import { RemoveSourceFromAgentUseCase } from './remove-source-from-agent.use-case';
import { RemoveSourceFromAgentCommand } from './remove-source-from-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { GetSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-source-by-id/get-source-by-id.use-case';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { Agent } from '../../../domain/agent.entity';
import { AgentSourceAssignment } from '../../../domain/agent-source-assignment.entity';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { AgentNotFoundError, UnexpectedAgentError } from '../../agents.errors';

// Create a concrete Source implementation for testing
class TestSource extends Source {
  constructor(params: any) {
    super(params);
  }
}

describe('RemoveSourceFromAgentUseCase', () => {
  let useCase: RemoveSourceFromAgentUseCase;
  let agentRepository: jest.Mocked<AgentRepository>;
  let contextService: jest.Mocked<ContextService>;
  let getSourceByIdUseCase: jest.Mocked<GetSourceByIdUseCase>;
  let deleteSourceUseCase: jest.Mocked<DeleteSourceUseCase>;

  const mockUserId = randomUUID();
  const mockAgentId = randomUUID();
  const mockSourceId = randomUUID();
  const mockSourceAssignmentId = randomUUID();

  beforeEach(async () => {
    const mockAgentRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn(),
    };

    const mockGetSourceByIdUseCase = {
      execute: jest.fn(),
    };

    const mockDeleteSourceUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveSourceFromAgentUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: GetSourceByIdUseCase, useValue: mockGetSourceByIdUseCase },
        { provide: DeleteSourceUseCase, useValue: mockDeleteSourceUseCase },
      ],
    }).compile();

    useCase = module.get<RemoveSourceFromAgentUseCase>(
      RemoveSourceFromAgentUseCase,
    );
    agentRepository = module.get(AgentRepository);
    contextService = module.get(ContextService);
    getSourceByIdUseCase = module.get(GetSourceByIdUseCase);
    deleteSourceUseCase = module.get(DeleteSourceUseCase);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const createMockAgent = () => {
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
        }),
      });

      const mockSource = new TestSource({
        id: mockSourceId,
        type: SourceType.FILE,
        name: 'test-file.txt',
        text: 'Test content',
        content: [],
      });

      const mockSourceAssignment = new AgentSourceAssignment({
        id: mockSourceAssignmentId,
        source: mockSource,
      });

      return new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [mockSourceAssignment],
        userId: mockUserId,
      });
    };

    it('should successfully remove a source from an agent', async () => {
      // Arrange
      const command = new RemoveSourceFromAgentCommand({
        agentId: mockAgentId,
        sourceAssignmentId: mockSourceAssignmentId,
      });

      const mockAgent = createMockAgent();
      const mockSource = mockAgent.sourceAssignments[0].source;
      const updatedAgent = new Agent({
        ...mockAgent,
        sourceAssignments: [],
      });

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      getSourceByIdUseCase.execute.mockResolvedValue(mockSource);
      deleteSourceUseCase.execute.mockResolvedValue(undefined);
      agentRepository.update.mockResolvedValue(updatedAgent);

      // Act
      await useCase.execute(command);

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(getSourceByIdUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockSourceId,
        }),
      );
      expect(deleteSourceUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          source: mockSource,
        }),
      );
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockAgentId,
          sourceAssignments: [],
        }),
      );
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      const command = new RemoveSourceFromAgentCommand({
        agentId: mockAgentId,
        sourceAssignmentId: mockSourceAssignmentId,
      });

      contextService.get.mockReturnValue(null);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw AgentNotFoundError when agent does not exist', async () => {
      // Arrange
      const command = new RemoveSourceFromAgentCommand({
        agentId: mockAgentId,
        sourceAssignmentId: mockSourceAssignmentId,
      });

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
      expect(getSourceByIdUseCase.execute).not.toHaveBeenCalled();
      expect(deleteSourceUseCase.execute).not.toHaveBeenCalled();
      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should return early when source assignment is not found', async () => {
      // Arrange
      const command = new RemoveSourceFromAgentCommand({
        agentId: mockAgentId,
        sourceAssignmentId: randomUUID(), // Different assignment ID
      });

      const mockAgent = createMockAgent();
      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);

      // Act
      await useCase.execute(command);

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(getSourceByIdUseCase.execute).not.toHaveBeenCalled();
      expect(deleteSourceUseCase.execute).not.toHaveBeenCalled();
      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should handle multiple source assignments correctly', async () => {
      // Arrange
      const secondSourceId = randomUUID();
      const secondSourceAssignmentId = randomUUID();

      const command = new RemoveSourceFromAgentCommand({
        agentId: mockAgentId,
        sourceAssignmentId: mockSourceAssignmentId,
      });

      const mockAgent = createMockAgent();
      const secondSource = new TestSource({
        id: secondSourceId,
        type: SourceType.URL,
        name: 'test-url',
        text: 'URL content',
        content: [],
      });

      const secondSourceAssignment = new AgentSourceAssignment({
        id: secondSourceAssignmentId,
        source: secondSource,
      });

      // Add second source assignment to agent
      const agentWithMultipleSources = new Agent({
        ...mockAgent,
        sourceAssignments: [
          mockAgent.sourceAssignments[0],
          secondSourceAssignment,
        ],
      });

      const updatedAgent = new Agent({
        ...agentWithMultipleSources,
        sourceAssignments: [secondSourceAssignment],
      });

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(agentWithMultipleSources);
      getSourceByIdUseCase.execute.mockResolvedValue(
        mockAgent.sourceAssignments[0].source,
      );
      deleteSourceUseCase.execute.mockResolvedValue(undefined);
      agentRepository.update.mockResolvedValue(updatedAgent);

      // Act
      await useCase.execute(command);

      // Assert
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockAgentId,
          sourceAssignments: [secondSourceAssignment], // Only the second assignment should remain
        }),
      );
    });

    it('should throw UnexpectedAgentError when repository operations fail', async () => {
      // Arrange
      const command = new RemoveSourceFromAgentCommand({
        agentId: mockAgentId,
        sourceAssignmentId: mockSourceAssignmentId,
      });

      const repositoryError = new Error('Database connection failed');

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedAgentError,
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error removing source from agent',
        expect.objectContaining({
          error: repositoryError,
        }),
      );
    });

    it('should throw UnexpectedAgentError when getSourceById fails', async () => {
      // Arrange
      const command = new RemoveSourceFromAgentCommand({
        agentId: mockAgentId,
        sourceAssignmentId: mockSourceAssignmentId,
      });

      const mockAgent = createMockAgent();
      const sourceError = new Error('Source not found');

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      getSourceByIdUseCase.execute.mockRejectedValue(sourceError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedAgentError,
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error removing source from agent',
        expect.objectContaining({
          error: sourceError,
        }),
      );
    });

    it('should throw UnexpectedAgentError when deleteSource fails', async () => {
      // Arrange
      const command = new RemoveSourceFromAgentCommand({
        agentId: mockAgentId,
        sourceAssignmentId: mockSourceAssignmentId,
      });

      const mockAgent = createMockAgent();
      const mockSource = mockAgent.sourceAssignments[0].source;
      const deleteError = new Error('Delete operation failed');

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      getSourceByIdUseCase.execute.mockResolvedValue(mockSource);
      deleteSourceUseCase.execute.mockRejectedValue(deleteError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedAgentError,
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Error removing source from agent',
        expect.objectContaining({
          error: deleteError,
        }),
      );
    });

    it('should rethrow ApplicationError instances without wrapping', async () => {
      // Arrange
      const command = new RemoveSourceFromAgentCommand({
        agentId: mockAgentId,
        sourceAssignmentId: mockSourceAssignmentId,
      });

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

    it('should log the operation with correct parameters', async () => {
      // Arrange
      const command = new RemoveSourceFromAgentCommand({
        agentId: mockAgentId,
        sourceAssignmentId: mockSourceAssignmentId,
      });

      const mockAgent = createMockAgent();
      const mockSource = mockAgent.sourceAssignments[0].source;
      const updatedAgent = new Agent({
        ...mockAgent,
        sourceAssignments: [],
      });

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      getSourceByIdUseCase.execute.mockResolvedValue(mockSource);
      deleteSourceUseCase.execute.mockResolvedValue(undefined);
      agentRepository.update.mockResolvedValue(updatedAgent);

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('removeSource', {
        agentId: mockAgentId,
        sourceAssignmentId: mockSourceAssignmentId,
      });
    });
  });
});
