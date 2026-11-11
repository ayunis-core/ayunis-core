import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import {
  createLoggerMock,
  type LoggerMock,
} from 'src/common/testing/logger.mock';
import { CreateThreadUseCase } from './create-thread.use-case';
import { CreateThreadCommand } from './create-thread.command';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import {
  NoModelProvidedError,
  ThreadCreationError,
} from 'src/domain/threads/application/threads.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';
import { ResolveModelModesUseCase } from 'src/domain/models/application/use-cases/resolve-model-modes/resolve-model-modes.use-case';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import {
  ConflictingModelSelectionError,
  ModelModeUnavailableError,
} from 'src/domain/threads/application/threads.errors';
import { FindNotificationUseCase } from 'src/domain/notifications/application/use-cases/find-notification/find-notification.use-case';
import { NotificationNotFoundError } from 'src/domain/notifications/application/notifications.errors';
import { aNotification } from 'src/domain/notifications/application/testing/notification.fixtures';

describe('CreateThreadUseCase', () => {
  let useCase: CreateThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let getPermittedLanguageModelUseCase: jest.Mocked<GetPermittedLanguageModelUseCase>;
  let contextService: jest.Mocked<ContextService>;
  let logger: LoggerMock;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174002' as UUID;

  const resolveModelModes = { execute: jest.fn() };
  const findNotification = { execute: jest.fn() };

  beforeEach(async () => {
    logger = createLoggerMock();
    const mockThreadsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockGetPermittedLanguageModelUseCase = {
      execute: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const mockAssertWorkspaceReadAccessUseCase = {
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
        { provide: ContextService, useValue: mockContextService },
        { provide: ResolveModelModesUseCase, useValue: resolveModelModes },
        {
          provide: AssertWorkspaceReadAccessUseCase,
          useValue: mockAssertWorkspaceReadAccessUseCase,
        },
        { provide: FindNotificationUseCase, useValue: findNotification },
      ],
    }).compile();

    useCase = module.get<CreateThreadUseCase>(CreateThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);
    getPermittedLanguageModelUseCase = module.get(
      GetPermittedLanguageModelUseCase,
    );
    contextService = module.get(ContextService);
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
        alias: 'Test Model',
        provider: ModelProvider.OPENAI,
        displayName: 'Test Model',
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: false,
        canVision: false,
        contextWindowSize: 128_000,
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

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(getModelExecuteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: command.modelId,
        }),
      );
      expect(threadsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          model: mockModel,
        }),
      );
      expect(contextService.get).toHaveBeenCalledWith('userId');
      expect(result).toBeTruthy();
    });

    it('should throw NoModelProvidedError when no model is provided', async () => {
      // Arrange
      const command = new CreateThreadCommand({});

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        NoModelProvidedError,
      );
      expect(getPermittedLanguageModelUseCase.execute).not.toHaveBeenCalled();
      expect(threadsRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate UnauthorizedAccessError when the model is not permitted', async () => {
      // Arrange
      const command = new CreateThreadCommand({
        modelId: mockModelId,
      });

      getPermittedLanguageModelUseCase.execute.mockRejectedValue(
        new UnauthorizedAccessError(),
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        UnauthorizedAccessError,
      );
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
        alias: 'Test Model',
        provider: ModelProvider.OPENAI,
        displayName: 'Test Model',
        canStream: true,
        isReasoning: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        canUseTools: false,
        canVision: false,
        contextWindowSize: 128_000,
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

      // Act
      await useCase.execute(command);

      // Assert
      expect(logger.log).toHaveBeenCalledWith('execute');
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
        alias: 'Test Model',
        provider: ModelProvider.OPENAI,
        displayName: 'Test Model',
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: false,
        canVision: false,
        contextWindowSize: 128_000,
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

      const getModelExecuteSpy = jest.spyOn(
        getPermittedLanguageModelUseCase,
        'execute',
      );

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ThreadCreationError,
      );
      expect(logger.error).toHaveBeenCalledWith(
        { userId: mockUserId, err: repositoryError },
        'Failed to create thread',
      );
      expect(getModelExecuteSpy).toHaveBeenCalled();
    });
  });

  describe('with a mode', () => {
    const permit = (anonymousOnly: boolean) =>
      new PermittedLanguageModel({
        model: new LanguageModel({
          name: 'mistral-large',
          alias: 'mistral-large',
          provider: ModelProvider.MISTRAL,
          displayName: 'Mistral Large',
          canStream: true,
          isReasoning: false,
          isArchived: false,
          canUseTools: true,
          canVision: false,
          contextWindowSize: 128_000,
        }),
        orgId: mockOrgId,
        anonymousOnly,
      });
    const standard = permit(false);
    const anonymousOnly = permit(true);

    beforeEach(() => {
      resolveModelModes.execute.mockResolvedValue([
        {
          mode: ModelMode.AUTO,
          permittedModel: standard,
          anonymousPermittedModel: anonymousOnly,
        },
        {
          mode: ModelMode.MAX,
          permittedModel: null,
          anonymousPermittedModel: null,
        },
      ]);
      threadsRepository.create.mockImplementation((t: Thread) =>
        Promise.resolve(t),
      );
    });

    it('binds the resolved model and stores the mode on the thread', async () => {
      const thread = await useCase.execute(
        new CreateThreadCommand({ mode: ModelMode.AUTO }),
      );

      expect(thread.model?.id).toBe(standard.id);
      expect(thread.mode).toBe(ModelMode.AUTO);
      expect(thread.isAnonymous).toBe(false);
      expect(getPermittedLanguageModelUseCase.execute).not.toHaveBeenCalled();
    });

    it('uses the anonymous resolution when anonymous mode is on', async () => {
      const thread = await useCase.execute(
        new CreateThreadCommand({ mode: ModelMode.AUTO, isAnonymous: true }),
      );

      expect(thread.model?.id).toBe(anonymousOnly.id);
      expect(thread.isAnonymous).toBe(true);
    });

    it('rejects a mode that resolves to no model', async () => {
      await expect(
        useCase.execute(new CreateThreadCommand({ mode: ModelMode.MAX })),
      ).rejects.toThrow(ModelModeUnavailableError);
      expect(threadsRepository.create).not.toHaveBeenCalled();
    });

    it('rejects a request carrying both a model and a mode', async () => {
      await expect(
        useCase.execute(
          new CreateThreadCommand({
            modelId: mockModelId,
            mode: ModelMode.AUTO,
          }),
        ),
      ).rejects.toThrow(ConflictingModelSelectionError);
    });

    it('leaves mode empty when an individual model is chosen', async () => {
      getPermittedLanguageModelUseCase.execute.mockResolvedValue(standard);

      const thread = await useCase.execute(
        new CreateThreadCommand({ modelId: mockModelId }),
      );

      expect(thread.mode).toBeNull();
    });
  });

  describe('about a notification', () => {
    const notification = aNotification();
    const standard = new PermittedLanguageModel({
      id: mockModelId,
      model: new LanguageModel({
        name: 'mistral-large',
        alias: 'mistral-large',
        provider: ModelProvider.MISTRAL,
        displayName: 'Mistral Large',
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: true,
        canVision: false,
        contextWindowSize: 128_000,
      }),
      orgId: mockOrgId,
      anonymousOnly: false,
    });

    beforeEach(() => {
      getPermittedLanguageModelUseCase.execute.mockResolvedValue(standard);
      threadsRepository.create.mockImplementation((t: Thread) =>
        Promise.resolve(t),
      );
    });

    it("links a regular chat to the user's notification", async () => {
      findNotification.execute.mockResolvedValue(notification);

      const thread = await useCase.execute(
        new CreateThreadCommand({
          modelId: mockModelId,
          sourceNotificationId: notification.id,
        }),
      );

      expect(findNotification.execute).toHaveBeenCalledWith(
        expect.objectContaining({ id: notification.id }),
      );
      expect(thread).toMatchObject({
        sourceNotificationId: notification.id,
        type: 'chat',
        routineId: null,
      });
    });

    it("refuses another user's notification without creating a thread", async () => {
      findNotification.execute.mockRejectedValue(
        new NotificationNotFoundError(notification.id),
      );

      await expect(
        useCase.execute(
          new CreateThreadCommand({
            modelId: mockModelId,
            sourceNotificationId: notification.id,
          }),
        ),
      ).rejects.toThrow(NotificationNotFoundError);
      expect(threadsRepository.create).not.toHaveBeenCalled();
    });

    it('does not look up a notification for an ordinary chat', async () => {
      const thread = await useCase.execute(
        new CreateThreadCommand({ modelId: mockModelId }),
      );

      expect(findNotification.execute).not.toHaveBeenCalled();
      expect(thread.sourceNotificationId).toBeNull();
    });
  });
});
