import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CreateThreadUseCase } from './create-thread.use-case';
import { CreateThreadCommand } from './create-thread.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { FindOneAgentUseCase } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import {
  NoModelOrAgentProvidedError,
  ThreadCreationError,
} from '../../threads.errors';
import { UUID } from 'crypto';

describe('CreateThreadUseCase', () => {
  let useCase: CreateThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let getPermittedLanguageModelUseCase: jest.Mocked<GetPermittedLanguageModelUseCase>;
  let findOneAgentUseCase: jest.Mocked<FindOneAgentUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174002' as UUID;

  beforeEach(async () => {
    const mockThreadsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockGetPermittedLanguageModelUseCase = {
      execute: jest.fn(),
    };

    const mockGetAgentUseCase = {
      execute: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateThreadUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
        {
          provide: GetPermittedLanguageModelUseCase,
          useValue: mockGetPermittedLanguageModelUseCase,
        },
        { provide: FindOneAgentUseCase, useValue: mockGetAgentUseCase },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<CreateThreadUseCase>(CreateThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);
    getPermittedLanguageModelUseCase = module.get(
      GetPermittedLanguageModelUseCase,
    );
    findOneAgentUseCase = module.get(FindOneAgentUseCase);
    contextService = module.get(ContextService);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create a thread with model successfully', async () => {
      // Arrange
      const command = new CreateThreadCommand({
        modelId: mockModelId,
      });

      const now = new Date();
      const languageModel = new LanguageModel({
        name: 'Test Model',
        provider: ModelProvider.OPENAI,
        displayName: 'Test Model',
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: false,
        createdAt: now,
        updatedAt: now,
      });
      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        model: languageModel,
        orgId: mockOrgId,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      });

      const mockCreatedThread = new Thread({
        userId: mockUserId,
        model: mockModel,
        agentId: undefined,
        messages: [],
        createdAt: now,
        updatedAt: now,
      });

      getPermittedLanguageModelUseCase.execute.mockResolvedValue(mockModel);
      threadsRepository.create.mockResolvedValue(mockCreatedThread);

      const getModelExecuteSpy = jest.spyOn(
        getPermittedLanguageModelUseCase,
        'execute',
      );
      const getAgentExecuteSpy = jest.spyOn(findOneAgentUseCase, 'execute');

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(getModelExecuteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: command.modelId,
        }),
      );
      expect(getAgentExecuteSpy).not.toHaveBeenCalled();
      expect(threadsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          model: mockModel,
          agentId: undefined,
        }),
      );
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(result).toBeTruthy();
    });

    it('should throw NoModelOrAgentProvidedError when neither model nor agent is provided', async () => {
      // Arrange
      const command = new CreateThreadCommand({});

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        NoModelOrAgentProvidedError,
      );
      expect(getPermittedLanguageModelUseCase.execute).not.toHaveBeenCalled();
      expect(findOneAgentUseCase.execute).not.toHaveBeenCalled();
      expect(threadsRepository.create).not.toHaveBeenCalled();
    });

    it('should log execution details', async () => {
      // Arrange
      const command = new CreateThreadCommand({
        modelId: mockModelId,
      });

      const now = new Date();
      const languageModel = new LanguageModel({
        name: 'Test Model',
        provider: ModelProvider.OPENAI,
        displayName: 'Test Model',
        canStream: true,
        isReasoning: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        canUseTools: false,
      });
      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        model: languageModel,
        orgId: mockOrgId,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      });

      const mockCreatedThread = new Thread({
        userId: mockUserId,
        model: mockModel,
        agentId: undefined,
        messages: [],
        createdAt: now,
        updatedAt: now,
      });

      getPermittedLanguageModelUseCase.execute.mockResolvedValue(mockModel);
      threadsRepository.create.mockResolvedValue(mockCreatedThread);

      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const getModelExecuteSpy = jest.spyOn(
        getPermittedLanguageModelUseCase,
        'execute',
      );

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('execute');
      expect(getModelExecuteSpy).toHaveBeenCalled();
    });

    it('should handle repository creation errors', async () => {
      // Arrange
      const command = new CreateThreadCommand({
        modelId: mockModelId,
      });

      const now = new Date();
      const languageModel = new LanguageModel({
        name: 'Test Model',
        provider: ModelProvider.OPENAI,
        displayName: 'Test Model',
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: false,
        createdAt: now,
        updatedAt: now,
      });
      const mockModel = new PermittedLanguageModel({
        id: mockModelId,
        model: languageModel,
        orgId: mockOrgId,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      });

      getPermittedLanguageModelUseCase.execute.mockResolvedValue(mockModel);

      const repositoryError = new Error('Database connection failed');
      threadsRepository.create.mockRejectedValue(repositoryError);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const getModelExecuteSpy = jest.spyOn(
        getPermittedLanguageModelUseCase,
        'execute',
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ThreadCreationError,
      );
      expect(errorSpy).toHaveBeenCalledWith('Failed to create thread', {
        userId: mockUserId,
        error: 'Database connection failed',
      });
      expect(getModelExecuteSpy).toHaveBeenCalled();
    });
  });
});
