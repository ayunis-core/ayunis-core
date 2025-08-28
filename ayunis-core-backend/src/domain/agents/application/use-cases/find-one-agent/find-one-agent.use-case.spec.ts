import { Test, TestingModule } from '@nestjs/testing';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { FindOneAgentUseCase } from './find-one-agent.use-case';
import { FindOneAgentQuery } from './find-one-agent.query';
import { AgentRepository } from '../../ports/agent.repository';
import { Agent } from '../../../domain/agent.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { AgentNotFoundError, UnexpectedAgentError } from '../../agents.errors';

describe('FindOneAgentUseCase', () => {
  let useCase: FindOneAgentUseCase;
  let agentRepository: jest.Mocked<AgentRepository>;
  let contextService: jest.Mocked<ContextService>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as any;
  const mockAgentId = '123e4567-e89b-12d3-a456-426614174001' as any;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174002' as any;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174003' as any;

  beforeEach(async () => {
    const mockAgentRepository = {
      create: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAllByOwner: jest.fn(),
      findAllByModel: jest.fn(),
      update: jest.fn(),
      updateModel: jest.fn(),
    } as jest.Mocked<AgentRepository>;

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindOneAgentUseCase,
        { provide: AgentRepository, useValue: mockAgentRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<FindOneAgentUseCase>(FindOneAgentUseCase);
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
    it('should find and return an agent successfully', async () => {
      // Arrange
      const query = new FindOneAgentQuery(mockAgentId);
      const mockModel = new PermittedLanguageModel({
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
      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [],
        userId: mockUserId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      agentRepository.findOne.mockResolvedValue(mockAgent);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(result).toBe(mockAgent);
    });

    it('should throw UnexpectedAgentError when user is not authenticated', async () => {
      // Arrange
      const query = new FindOneAgentQuery(mockAgentId);
      contextService.get.mockReturnValue(null); // No userId in context

      const logSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnexpectedAgentError,
      );
      await expect(useCase.execute(query)).rejects.toThrow(
        'User not authenticated',
      );

      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('Failed to find agent', {
        agentId: mockAgentId,
        error: 'User not authenticated',
      });
    });

    it('should throw AgentNotFoundError when agent does not exist', async () => {
      // Arrange
      const query = new FindOneAgentQuery(mockAgentId);
      agentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(AgentNotFoundError);
      await expect(useCase.execute(query)).rejects.toThrow(
        `Agent with ID ${mockAgentId} not found`,
      );

      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
    });

    it('should rethrow ApplicationError when repository throws one', async () => {
      // Arrange
      const query = new FindOneAgentQuery(mockAgentId);
      const applicationError = new AgentNotFoundError(mockAgentId);
      agentRepository.findOne.mockRejectedValue(applicationError);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(applicationError);

      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
    });

    it('should throw UnexpectedAgentError and log error when repository throws unexpected error', async () => {
      // Arrange
      const query = new FindOneAgentQuery(mockAgentId);
      const unexpectedError = new Error('Database connection failed');
      agentRepository.findOne.mockRejectedValue(unexpectedError);

      const logSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnexpectedAgentError,
      );
      await expect(useCase.execute(query)).rejects.toThrow(
        'Database connection failed',
      );

      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
      expect(logSpy).toHaveBeenCalledWith('Failed to find agent', {
        agentId: mockAgentId,
        error: 'Database connection failed',
      });
    });

    it('should handle unknown error without message', async () => {
      // Arrange
      const query = new FindOneAgentQuery(mockAgentId);
      const unknownError = { someProperty: 'value' }; // Not an Error instance
      agentRepository.findOne.mockRejectedValue(unknownError);

      const logSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        UnexpectedAgentError,
      );
      await expect(useCase.execute(query)).rejects.toThrow(
        'Unknown error when finding agent',
      );

      expect(logSpy).toHaveBeenCalledWith('Failed to find agent', {
        agentId: mockAgentId,
        error: 'Unknown error',
      });
    });

    it('should log the query execution', async () => {
      // Arrange
      const query = new FindOneAgentQuery(mockAgentId);
      const mockModel = new PermittedLanguageModel({
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
      const mockAgent = new Agent({
        id: mockAgentId,
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        toolAssignments: [],
        sourceAssignments: [],
        userId: mockUserId,
      });

      agentRepository.findOne.mockResolvedValue(mockAgent);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(query);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('execute', { query });
    });

    it('should call repository with correct parameters', async () => {
      // Arrange
      const query = new FindOneAgentQuery(mockAgentId);
      const mockModel = new PermittedLanguageModel({
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
      const mockAgent = new Agent({
        name: 'Test Agent',
        instructions: 'Test instructions',
        model: mockModel,
        userId: mockUserId,
      });

      agentRepository.findOne.mockResolvedValue(mockAgent);

      // Act
      await useCase.execute(query);

      // Assert
      expect(agentRepository.findOne).toHaveBeenCalledTimes(1);
      expect(agentRepository.findOne).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
      );
    });
  });
});
