import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { CreateThreadUseCase } from './create-thread.use-case';
import { CreateThreadCommand } from './create-thread.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetAgentUseCase } from 'src/domain/agents/application/use-cases/get-agent/get-agent.use-case';
import {
  NoModelOrAgentProvidedError,
  ThreadCreationError,
} from '../../threads.errors';

describe('CreateThreadUseCase', () => {
  let useCase: CreateThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let getPermittedLanguageModelUseCase: jest.Mocked<GetPermittedLanguageModelUseCase>;
  let getAgentUseCase: jest.Mocked<GetAgentUseCase>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as any;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174001' as any;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174002' as any;
  const mockAgentId = '123e4567-e89b-12d3-a456-426614174003' as any;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateThreadUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
        {
          provide: GetPermittedLanguageModelUseCase,
          useValue: mockGetPermittedLanguageModelUseCase,
        },
        { provide: GetAgentUseCase, useValue: mockGetAgentUseCase },
      ],
    }).compile();

    useCase = module.get<CreateThreadUseCase>(CreateThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);
    getPermittedLanguageModelUseCase = module.get(
      GetPermittedLanguageModelUseCase,
    );
    getAgentUseCase = module.get(GetAgentUseCase);

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
        userId: mockUserId,
        orgId: mockOrgId,
        modelId: mockModelId,
      });

      const mockModel = {
        id: mockModelId,
        name: 'Test Model',
        model: { id: mockModelId, name: 'Test Model' } as any,
        orgId: mockOrgId,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreatedThread = {
        id: '123e4567-e89b-12d3-a456-426614174004' as any,
        userId: command.userId,
        model: mockModel,
        agent: undefined,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      threadsRepository.create.mockResolvedValue(mockCreatedThread as any);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(getPermittedLanguageModelUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: command.modelId,
          orgId: command.orgId,
        }),
      );
      expect(getAgentUseCase.execute).not.toHaveBeenCalled();
      expect(threadsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: command.userId,
          model: mockModel,
          agent: undefined,
        }),
      );
      expect(result).toBeTruthy();
    });

    it('should throw NoModelOrAgentProvidedError when neither model nor agent is provided', async () => {
      // Arrange
      const command = new CreateThreadCommand({
        userId: mockUserId,
        orgId: mockOrgId,
      });

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        NoModelOrAgentProvidedError,
      );
      expect(getPermittedLanguageModelUseCase.execute).not.toHaveBeenCalled();
      expect(getAgentUseCase.execute).not.toHaveBeenCalled();
      expect(threadsRepository.create).not.toHaveBeenCalled();
    });

    it('should log execution details', async () => {
      // Arrange
      const command = new CreateThreadCommand({
        userId: mockUserId,
        orgId: mockOrgId,
        modelId: mockModelId,
      });

      const mockModel = {
        id: mockModelId,
        name: 'Test Model',
        model: { id: mockModelId, name: 'Test Model' } as any,
        orgId: mockOrgId,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreatedThread = {
        id: '123e4567-e89b-12d3-a456-426614174004' as any,
        userId: command.userId,
        model: mockModel,
        agent: undefined,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );
      threadsRepository.create.mockResolvedValue(mockCreatedThread as any);

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('execute', {
        userId: command.userId,
      });
    });

    it('should handle repository creation errors', async () => {
      // Arrange
      const command = new CreateThreadCommand({
        userId: mockUserId,
        orgId: mockOrgId,
        modelId: mockModelId,
      });

      const mockModel = {
        id: mockModelId,
        name: 'Test Model',
        model: { id: mockModelId, name: 'Test Model' } as any,
        orgId: mockOrgId,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      getPermittedLanguageModelUseCase.execute.mockResolvedValue(
        mockModel as any,
      );

      const repositoryError = new Error('Database connection failed');
      threadsRepository.create.mockRejectedValue(repositoryError);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ThreadCreationError,
      );
      expect(errorSpy).toHaveBeenCalledWith('Failed to create thread', {
        userId: command.userId,
        error: 'Database connection failed',
      });
    });
  });
});
