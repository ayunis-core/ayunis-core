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
import { Currency } from '../../../../models/domain/value-objects/currency.enum';
import type { UUID } from 'crypto';
import { LanguageModel } from '../../../../models/domain/models/language.model';
import type { Usage } from '../../../domain/usage.entity';
import { ContextService } from '../../../../../common/context/services/context.service';

describe('CollectUsageUseCase', () => {
  let useCase: CollectUsageUseCase;
  let mockUsageRepository: Partial<UsageRepository>;
  let mockContextService: Partial<ContextService>;

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

  beforeEach(async () => {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectUsageUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<CollectUsageUseCase>(CollectUsageUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('successful usage collection', () => {
    it('should collect usage successfully in cloud mode', async () => {
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
          currency: undefined,
          requestId,
        }),
      );
    });

    it('should collect usage with cost', async () => {
      const model = createMockModel({
        inputTokenCost: 0.001,
        outputTokenCost: 0.002,
        currency: Currency.EUR,
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
          currency: Currency.EUR,
        }),
      );
    });

    it('should calculate cost correctly', async () => {
      const model = createMockModel({
        inputTokenCost: 0.001,
        outputTokenCost: 0.002,
        currency: Currency.EUR,
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
      // inputCost = (2000/1000) * 0.001 = 0.002
      // outputCost = (1000/1000) * 0.002 = 0.002
      // totalCost = 0.004
      expect(saveCall.cost).toBeCloseTo(0.004, 6);
      expect(saveCall.currency).toBe(Currency.EUR);
    });

    it('should calculate and store small costs correctly', async () => {
      const model = createMockModel({
        inputTokenCost: 0.0000001,
        outputTokenCost: 0.0000001,
        currency: Currency.EUR,
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
      // inputCost = (100/1000) * 0.0000001 = 0.00000001
      // outputCost = (50/1000) * 0.0000001 = 0.000000005
      // totalCost = 0.000000015
      expect(saveCall.cost).toBeCloseTo(0.000000015, 10);
      expect(saveCall.currency).toBe(Currency.EUR);
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
      expect(saveCall.currency).toBeUndefined();
    });

    it('should return undefined cost if model has costs but no currency', async () => {
      const model = createMockModel({
        inputTokenCost: 0.001,
        outputTokenCost: 0.002,
        currency: undefined,
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
      // Cost should be undefined because currency is missing
      expect(saveCall.cost).toBeUndefined();
      expect(saveCall.currency).toBeUndefined();
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
          currency: undefined,
        }),
      );
    });
  });
});
