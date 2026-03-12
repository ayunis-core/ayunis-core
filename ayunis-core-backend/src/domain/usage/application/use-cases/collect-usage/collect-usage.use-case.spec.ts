import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CollectUsageUseCase } from './collect-usage.use-case';
import { CollectUsageCommand } from './collect-usage.command';
import { UsageRepository } from '../../ports/usage.repository';
import {
  InvalidUsageDataError,
  UsageCollectionFailedError,
  UnexpectedUsageError,
} from '../../usage.errors';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';
import type { UUID } from 'crypto';
import { LanguageModel } from '../../../../models/domain/models/language.model';
import type { Usage } from '../../../domain/usage.entity';
import { ContextService } from '../../../../../common/context/services/context.service';
import { GetCreditsPerEuroUseCase } from '../../../../../iam/platform-config/application/use-cases/get-credits-per-euro/get-credits-per-euro.use-case';
import { PlatformConfigNotFoundError } from '../../../../../iam/platform-config/application/platform-config.errors';

describe('CollectUsageUseCase', () => {
  let useCase: CollectUsageUseCase;
  let mockUsageRepository: Partial<UsageRepository>;
  let mockContextService: Partial<ContextService>;
  let mockGetCreditsPerEuroUseCase: { execute: jest.Mock };

  const userId = 'user-id' as UUID;
  const orgId = 'org-id' as UUID;
  const modelId = 'model-id' as UUID;
  const requestId = 'request-id' as UUID;

  const createMockModel = (
    overrides?: Partial<LanguageModel>,
  ): LanguageModel => {
    return new LanguageModel({
      id: modelId,
      name: 'test-model',
      provider: ModelProvider.OPENAI,
      displayName: 'Test Model',
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      canVision: false,
      isArchived: false,
      ...overrides,
    });
  };

  beforeAll(async () => {
    mockUsageRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockContextService = {
      get: jest.fn((key?: 'userId' | 'orgId') => {
        if (key === 'userId') return userId;
        if (key === 'orgId') return orgId;
        return undefined;
      }) as any,
    };

    mockGetCreditsPerEuroUseCase = {
      execute: jest.fn().mockResolvedValue(100),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectUsageUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: GetCreditsPerEuroUseCase,
          useValue: mockGetCreditsPerEuroUseCase,
        },
      ],
    }).compile();

    useCase = module.get<CollectUsageUseCase>(CollectUsageUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    (mockContextService.get as jest.Mock).mockImplementation(
      (key?: 'userId' | 'orgId') => {
        if (key === 'userId') return userId;
        if (key === 'orgId') return orgId;
        return undefined;
      },
    );
    (mockUsageRepository.save as jest.Mock).mockResolvedValue(undefined);
    mockGetCreditsPerEuroUseCase.execute.mockResolvedValue(100);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('successful usage collection', () => {
    it('should collect usage successfully when model has no cost info', async () => {
      const model = createMockModel();
      const command = new CollectUsageCommand({
        model,
        inputTokens: 100,
        outputTokens: 50,
        requestId,
      });

      await useCase.execute(command);

      expect(mockUsageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          organizationId: orgId,
          modelId,
          provider: ModelProvider.OPENAI,
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          cost: undefined,
          requestId,
        }),
      );
    });

    it('should collect usage with cost in EUR', async () => {
      const model = createMockModel({
        inputTokenCost: 1,
        outputTokenCost: 2,
      });

      const command = new CollectUsageCommand({
        model,
        inputTokens: 1000,
        outputTokens: 500,
        requestId,
      });

      await useCase.execute(command);

      expect(mockUsageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          organizationId: orgId,
          modelId,
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          cost: expect.any(Number) as number,
        }),
      );
    });

    it('should calculate cost correctly in EUR', async () => {
      const model = createMockModel({
        inputTokenCost: 1,
        outputTokenCost: 2,
      });

      const command = new CollectUsageCommand({
        model,
        inputTokens: 2000,
        outputTokens: 1000,
        requestId,
      });

      await useCase.execute(command);

      const saveMock = mockUsageRepository.save as jest.Mock<
        Promise<void>,
        [Usage]
      >;
      const saveCall = saveMock.mock.calls[0]?.[0];
      if (!saveCall) {
        throw new Error('save was not called');
      }
      // inputCost = (2000/1_000_000) * 1 = 0.002
      // outputCost = (1000/1_000_000) * 2 = 0.002
      // totalCost = 0.004
      expect(saveCall.cost).toBeCloseTo(0.004, 6);
    });

    it('should calculate and store small costs correctly', async () => {
      const model = createMockModel({
        inputTokenCost: 0.0001,
        outputTokenCost: 0.0001,
      });

      const command = new CollectUsageCommand({
        model,
        inputTokens: 100,
        outputTokens: 50,
        requestId,
      });

      await useCase.execute(command);

      const saveMock = mockUsageRepository.save as jest.Mock<
        Promise<void>,
        [Usage]
      >;
      const saveCall = saveMock.mock.calls[0]?.[0];
      if (!saveCall) {
        throw new Error('save was not called');
      }
      // inputCost = (100/1_000_000) * 0.0001 = 0.00000001
      // outputCost = (50/1_000_000) * 0.0001 = 0.000000005
      // totalCost = 0.000000015
      expect(saveCall.cost).toBeCloseTo(0.000000015, 10);
    });

    it('should return undefined cost if model has no cost info', async () => {
      const model = createMockModel({
        inputTokenCost: undefined,
        outputTokenCost: undefined,
      });

      const command = new CollectUsageCommand({
        model,
        inputTokens: 100,
        outputTokens: 50,
        requestId,
      });

      await useCase.execute(command);

      const saveMock = mockUsageRepository.save as jest.Mock<
        Promise<void>,
        [Usage]
      >;
      const saveCall = saveMock.mock.calls[0]?.[0];
      if (!saveCall) {
        throw new Error('save was not called');
      }
      expect(saveCall.cost).toBeUndefined();
    });

    it('should return undefined cost if only input cost is set', async () => {
      const model = createMockModel({
        inputTokenCost: 1,
        outputTokenCost: undefined,
      });

      const command = new CollectUsageCommand({
        model,
        inputTokens: 1000,
        outputTokens: 500,
        requestId,
      });

      await useCase.execute(command);

      const saveMock = mockUsageRepository.save as jest.Mock<
        Promise<void>,
        [Usage]
      >;
      const saveCall = saveMock.mock.calls[0]?.[0];
      if (!saveCall) {
        throw new Error('save was not called');
      }
      expect(saveCall.cost).toBeUndefined();
    });
  });

  describe('validation errors', () => {
    it('should throw InvalidUsageDataError for negative input tokens', async () => {
      const model = createMockModel();
      const command = new CollectUsageCommand({
        model,
        inputTokens: -1,
        outputTokens: 50,
        requestId,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidUsageDataError,
      );
      expect(mockUsageRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InvalidUsageDataError for negative output tokens', async () => {
      const model = createMockModel();
      const command = new CollectUsageCommand({
        model,
        inputTokens: 100,
        outputTokens: -1,
        requestId,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidUsageDataError,
      );
      expect(mockUsageRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InvalidUsageDataError for negative total tokens', async () => {
      const model = createMockModel();
      const command = new CollectUsageCommand({
        model,
        inputTokens: -50,
        outputTokens: 50,
        requestId,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidUsageDataError,
      );
      expect(mockUsageRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw UsageCollectionFailedError when userId is missing from context', async () => {
      jest.spyOn(mockContextService, 'get').mockImplementation(((
        key?: 'userId' | 'orgId',
      ) => {
        if (key === 'userId') return undefined;
        if (key === 'orgId') return orgId;
        return undefined;
      }) as any);

      const model = createMockModel();
      const command = new CollectUsageCommand({
        model,
        inputTokens: 100,
        outputTokens: 50,
        requestId,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        UsageCollectionFailedError,
      );
      expect(mockUsageRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UsageCollectionFailedError when orgId is missing from context', async () => {
      jest.spyOn(mockContextService, 'get').mockImplementation(((
        key?: 'userId' | 'orgId',
      ) => {
        if (key === 'userId') return userId;
        if (key === 'orgId') return undefined;
        return undefined;
      }) as any);

      const model = createMockModel();
      const command = new CollectUsageCommand({
        model,
        inputTokens: 100,
        outputTokens: 50,
        requestId,
      });

      await expect(useCase.execute(command)).rejects.toThrow(
        UsageCollectionFailedError,
      );
      expect(mockUsageRepository.save).not.toHaveBeenCalled();
    });

    it('should wrap repository errors in UnexpectedUsageError', async () => {
      const model = createMockModel();
      const command = new CollectUsageCommand({
        model,
        inputTokens: 100,
        outputTokens: 50,
        requestId,
      });

      const repositoryError = new Error('Database connection failed');
      jest
        .spyOn(mockUsageRepository, 'save')
        .mockRejectedValue(repositoryError);

      await expect(useCase.execute(command)).rejects.toThrow(
        UnexpectedUsageError,
      );
    });

    it('should re-throw ApplicationError instances', async () => {
      const model = createMockModel();
      const command = new CollectUsageCommand({
        model,
        inputTokens: 100,
        outputTokens: 50,
        requestId,
      });

      const appError = new InvalidUsageDataError('Test error');
      jest.spyOn(mockUsageRepository, 'save').mockRejectedValue(appError);

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidUsageDataError,
      );
    });

    it('should handle cost calculation gracefully when model has no cost info', async () => {
      const model = createMockModel({
        inputTokenCost: undefined,
        outputTokenCost: undefined,
      });

      const command = new CollectUsageCommand({
        model,
        inputTokens: 100,
        outputTokens: 50,
        requestId,
      });

      await useCase.execute(command);

      // Should still save usage but without cost
      expect(mockUsageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cost: undefined,
        }),
      );
    });
  });

  describe('credits calculation', () => {
    it('should compute creditsConsumed correctly when creditsPerEuro is set', async () => {
      mockGetCreditsPerEuroUseCase.execute.mockResolvedValue(100);

      const model = createMockModel({
        inputTokenCost: 1,
        outputTokenCost: 2,
      });

      const command = new CollectUsageCommand({
        model,
        inputTokens: 2000,
        outputTokens: 1000,
        requestId,
      });

      await useCase.execute(command);

      const saveMock = mockUsageRepository.save as jest.Mock<
        Promise<void>,
        [Usage]
      >;
      const saveCall = saveMock.mock.calls[0]?.[0];
      if (!saveCall) {
        throw new Error('save was not called');
      }
      // cost = (2000/1_000_000)*1 + (1000/1_000_000)*2 = 0.004
      // creditsConsumed = 0.004 * 100 = 0.4
      expect(saveCall.creditsConsumed).toBeCloseTo(0.4, 6);
    });

    it('should set creditsConsumed to undefined when model has no cost info', async () => {
      const model = createMockModel({
        inputTokenCost: undefined,
        outputTokenCost: undefined,
      });

      const command = new CollectUsageCommand({
        model,
        inputTokens: 100,
        outputTokens: 50,
        requestId,
      });

      await useCase.execute(command);

      const saveMock = mockUsageRepository.save as jest.Mock<
        Promise<void>,
        [Usage]
      >;
      const saveCall = saveMock.mock.calls[0]?.[0];
      if (!saveCall) {
        throw new Error('save was not called');
      }
      expect(saveCall.creditsConsumed).toBeUndefined();
      // Should not even call getCreditsPerEuro when cost is undefined
      expect(mockGetCreditsPerEuroUseCase.execute).not.toHaveBeenCalled();
    });

    it('should set creditsConsumed to undefined when creditsPerEuro is not configured', async () => {
      mockGetCreditsPerEuroUseCase.execute.mockRejectedValue(
        new PlatformConfigNotFoundError('creditsPerEuro'),
      );

      const model = createMockModel({
        inputTokenCost: 1,
        outputTokenCost: 2,
      });

      const command = new CollectUsageCommand({
        model,
        inputTokens: 1000,
        outputTokens: 500,
        requestId,
      });

      await useCase.execute(command);

      const saveMock = mockUsageRepository.save as jest.Mock<
        Promise<void>,
        [Usage]
      >;
      const saveCall = saveMock.mock.calls[0]?.[0];
      if (!saveCall) {
        throw new Error('save was not called');
      }
      // Cost should still be calculated
      expect(saveCall.cost).toBeDefined();
      // But credits should be undefined (graceful fallback)
      expect(saveCall.creditsConsumed).toBeUndefined();
    });
  });
});
