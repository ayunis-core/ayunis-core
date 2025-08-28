import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { AddSourceToAgentUseCase } from './add-source-to-agent.use-case';
import { AddSourceToAgentCommand } from './add-source-to-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { ContextService } from 'src/common/context/services/context.service';
import {
  AgentNotFoundError,
  SourceAlreadyAssignedError,
  UnexpectedAgentError,
} from '../../agents.errors';
import { Agent } from '../../../domain/agent.entity';
import { AgentSourceAssignment } from '../../../domain/agent-source-assignment.entity';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

// Mock Source implementation since it's abstract
class MockSource extends Source {
  constructor(params: any) {
    super(params);
  }
}

describe('AddSourceToAgentUseCase', () => {
  let useCase: AddSourceToAgentUseCase;
  let agentRepository: jest.Mocked<AgentRepository>;
  let contextService: jest.Mocked<ContextService>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as any;
  const mockAgentId = '123e4567-e89b-12d3-a456-426614174001' as any;
  const mockSourceId = '123e4567-e89b-12d3-a456-426614174002' as any;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174003' as any;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174004' as any;

  let mockSource: MockSource;
  let mockModel: PermittedLanguageModel;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockAgentRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddSourceToAgentUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<AddSourceToAgentUseCase>(AddSourceToAgentUseCase);
    agentRepository = module.get(AgentRepository);
    contextService = module.get(ContextService);

    // Mock logger methods
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Create mock entities
    mockSource = new MockSource({
      id: mockSourceId,
      type: SourceType.FILE,
      name: 'Test Source',
      text: 'Test source content',
      content: [],
    });

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
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should add source to agent successfully when agent has no existing sources', async () => {
      // Arrange
      const command = new AddSourceToAgentCommand({
        agentId: mockAgentId,
        source: mockSource,
      });

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        sourceAssignments: [], // No existing source assignments
      });

      const updatedMockAgent = new Agent({
        ...mockAgent,
        sourceAssignments: [new AgentSourceAssignment({ source: mockSource })],
      });

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      agentRepository.update.mockResolvedValue(updatedMockAgent);

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
          sourceAssignments: expect.arrayContaining([
            expect.objectContaining({
              source: mockSource,
            }),
          ]),
        }),
      );
      expect(result).toBeInstanceOf(AgentSourceAssignment);
      expect(result.source).toBe(mockSource);
      expect(logSpy).toHaveBeenCalledWith('addSource', {
        agentId: mockAgentId,
        sourceId: mockSourceId,
      });
    });

    it('should add source to agent successfully when agent has existing sources', async () => {
      // Arrange
      const existingSourceId = '123e4567-e89b-12d3-a456-426614174005' as any;
      const existingSource = new MockSource({
        id: existingSourceId,
        type: SourceType.URL,
        name: 'Existing Source',
        text: 'Existing source content',
        content: [],
      });
      const existingAssignment = new AgentSourceAssignment({
        source: existingSource,
      });

      const command = new AddSourceToAgentCommand({
        agentId: mockAgentId,
        source: mockSource,
      });

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        sourceAssignments: [existingAssignment],
      });

      const updatedMockAgent = new Agent({
        ...mockAgent,
        sourceAssignments: [
          existingAssignment,
          new AgentSourceAssignment({ source: mockSource }),
        ],
      });

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      agentRepository.update.mockResolvedValue(updatedMockAgent);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(agentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceAssignments: expect.arrayContaining([
            existingAssignment,
            expect.objectContaining({
              source: mockSource,
            }),
          ]),
        }),
      );
      expect(result).toBeInstanceOf(AgentSourceAssignment);
      expect(result.source).toBe(mockSource);
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      // Arrange
      const command = new AddSourceToAgentCommand({
        agentId: mockAgentId,
        source: mockSource,
      });

      contextService.get.mockReturnValue(null); // No user ID

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw AgentNotFoundError when agent does not exist', async () => {
      // Arrange
      const command = new AddSourceToAgentCommand({
        agentId: mockAgentId,
        source: mockSource,
      });

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(null); // Agent not found

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

    it('should throw SourceAlreadyAssignedError when source is already assigned to agent', async () => {
      // Arrange
      const existingAssignment = new AgentSourceAssignment({
        source: mockSource, // Same source as in command
      });

      const command = new AddSourceToAgentCommand({
        agentId: mockAgentId,
        source: mockSource,
      });

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        sourceAssignments: [existingAssignment],
      });

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        SourceAlreadyAssignedError,
      );
      expect(agentRepository.update).not.toHaveBeenCalled();
    });

    it('should handle agent with undefined sourceAssignments', async () => {
      // Arrange
      const command = new AddSourceToAgentCommand({
        agentId: mockAgentId,
        source: mockSource,
      });

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        sourceAssignments: undefined as any, // Explicitly undefined
      });

      const updatedMockAgent = new Agent({
        ...mockAgent,
        sourceAssignments: [new AgentSourceAssignment({ source: mockSource })],
      });

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      agentRepository.update.mockResolvedValue(updatedMockAgent);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result).toBeInstanceOf(AgentSourceAssignment);
      expect(result.source).toBe(mockSource);
    });

    it('should throw UnexpectedAgentError when repository throws unexpected error', async () => {
      // Arrange
      const command = new AddSourceToAgentCommand({
        agentId: mockAgentId,
        source: mockSource,
      });

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        sourceAssignments: [],
      });

      const repositoryError = new Error('Database connection failed');

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      agentRepository.update.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedAgentError,
      );
      expect(errorSpy).toHaveBeenCalledWith('Error adding source to agent', {
        error: repositoryError,
      });
    });

    it('should re-throw ApplicationError without wrapping', async () => {
      // Arrange
      const command = new AddSourceToAgentCommand({
        agentId: mockAgentId,
        source: mockSource,
      });

      const agentNotFoundError = new AgentNotFoundError(mockAgentId);

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockRejectedValue(agentNotFoundError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        AgentNotFoundError,
      );
      expect(errorSpy).not.toHaveBeenCalled(); // Should not log ApplicationErrors
    });

    it('should log the operation with correct parameters', async () => {
      // Arrange
      const command = new AddSourceToAgentCommand({
        agentId: mockAgentId,
        source: mockSource,
      });

      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
        sourceAssignments: [],
      });

      contextService.get.mockReturnValue(mockUserId);
      agentRepository.findOne.mockResolvedValue(mockAgent);
      agentRepository.update.mockResolvedValue(mockAgent);

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('addSource', {
        agentId: mockAgentId,
        sourceId: mockSourceId,
      });
    });
  });
});
