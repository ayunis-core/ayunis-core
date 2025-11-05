import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CollectUsageUseCase } from './collect-usage.use-case';
import { CollectUsageCommand } from './collect-usage.command';
import { UsageRepository } from '../../ports/usage.repository';
import { ModelsRepository } from '../../../../models/application/ports/models.repository';
import {
  InvalidUsageDataError,
  UsageCollectionFailedError,
} from '../../usage.errors';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';
import { Currency } from '../../../../models/domain/value-objects/currency.enum';
import { UUID } from 'crypto';
import { LanguageModel } from '../../../../models/domain/models/language.model';
import { Usage } from '../../../domain/usage.entity';

describe('CollectUsageUseCase', () => {
  let useCase: CollectUsageUseCase;
  let mockUsageRepository: Partial<UsageRepository>;
  let mockConfigService: Partial<ConfigService>;
  let mockModelsRepository: Partial<ModelsRepository>;

  const userId = 'user-id' as UUID;
  const orgId = 'org-id' as UUID;
  const modelId = 'model-id' as UUID;
  const requestId = 'request-id' as UUID;

  beforeEach(async () => {
    mockUsageRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(false),
    };

    mockModelsRepository = {
      findOneLanguage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectUsageUseCase,
        { provide: UsageRepository, useValue: mockUsageRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ModelsRepository, useValue: mockModelsRepository },
      ],
    }).compile();

    useCase = module.get<CollectUsageUseCase>(CollectUsageUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('successful usage collection', () => {
    it('should collect usage successfully in cloud mode', async () => {
      const command = new CollectUsageCommand(
        userId,
        orgId,
        modelId,
        ModelProvider.OPENAI,
        requestId,
        100,
        50,
        150,
      );

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

    it('should collect usage with cost in self-hosted mode', async () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(true);

      const mockModel = {
        id: modelId,
        name: 'test-model',
        provider: ModelProvider.OPENAI,
        displayName: 'Test Model',
        canStream: true,
        canUseTools: true,
        isReasoning: false,
        isArchived: false,
        inputTokenCost: 0.001,
        outputTokenCost: 0.002,
        currency: Currency.EUR,
      } as LanguageModel;

      jest
        .spyOn(mockModelsRepository, 'findOneLanguage')
        .mockResolvedValue(mockModel);

      const command = new CollectUsageCommand(
        userId,
        orgId,
        modelId,
        ModelProvider.OPENAI,
        requestId,
        1000,
        500,
        1500,
      );

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
      jest.spyOn(mockConfigService, 'get').mockReturnValue(true);

      const mockModel = {
        id: modelId,
        name: 'test-model',
        provider: ModelProvider.OPENAI,
        displayName: 'Test Model',
        canStream: true,
        canUseTools: true,
        isReasoning: false,
        isArchived: false,
        inputTokenCost: 0.001,
        outputTokenCost: 0.002,
        currency: Currency.EUR,
      } as LanguageModel;

      jest
        .spyOn(mockModelsRepository, 'findOneLanguage')
        .mockResolvedValue(mockModel);

      const command = new CollectUsageCommand(
        userId,
        orgId,
        modelId,
        ModelProvider.OPENAI,
        requestId,
        2000,
        1000,
        3000,
      );

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

    it('should return zero cost if below minimum threshold', async () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(true);

      const mockModel = {
        id: modelId,
        inputTokenCost: 0.0000001,
        outputTokenCost: 0.0000001,
        currency: Currency.EUR,
      } as LanguageModel;

      jest
        .spyOn(mockModelsRepository, 'findOneLanguage')
        .mockResolvedValue(mockModel);

      const command = new CollectUsageCommand(
        userId,
        orgId,
        modelId,
        ModelProvider.OPENAI,
        requestId,
        100,
        50,
        150,
      );

      await useCase.execute(command);

      const saveMock = mockUsageRepository.save as jest.Mock<
        Promise<void>,
        [Usage]
      >;
      const saveCall = saveMock.mock.calls[0]?.[0];
      if (!saveCall) {
        throw new Error('save was not called');
      }
      expect(saveCall.cost).toBe(0);
    });

    it('should return undefined cost if model not found', async () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(true);

      jest
        .spyOn(mockModelsRepository, 'findOneLanguage')
        .mockResolvedValue(undefined);

      const command = new CollectUsageCommand(
        userId,
        orgId,
        modelId,
        ModelProvider.OPENAI,
        requestId,
        100,
        50,
        150,
      );

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
  });

  describe('validation errors', () => {
    it('should throw InvalidUsageDataError for negative input tokens', async () => {
      const command = new CollectUsageCommand(
        userId,
        orgId,
        modelId,
        ModelProvider.OPENAI,
        requestId,
        -1,
        50,
        150,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidUsageDataError,
      );
      expect(mockUsageRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InvalidUsageDataError for negative output tokens', async () => {
      const command = new CollectUsageCommand(
        userId,
        orgId,
        modelId,
        ModelProvider.OPENAI,
        requestId,
        100,
        -1,
        150,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidUsageDataError,
      );
      expect(mockUsageRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InvalidUsageDataError for negative total tokens', async () => {
      const command = new CollectUsageCommand(
        userId,
        orgId,
        modelId,
        ModelProvider.OPENAI,
        requestId,
        100,
        50,
        -1,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidUsageDataError,
      );
      expect(mockUsageRepository.save).not.toHaveBeenCalled();
    });

    it('should throw InvalidUsageDataError when total tokens does not match sum', async () => {
      const command = new CollectUsageCommand(
        userId,
        orgId,
        modelId,
        ModelProvider.OPENAI,
        requestId,
        100,
        50,
        200, // Should be 150
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidUsageDataError,
      );
      expect(mockUsageRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should wrap repository errors in UsageCollectionFailedError', async () => {
      const command = new CollectUsageCommand(
        userId,
        orgId,
        modelId,
        ModelProvider.OPENAI,
        requestId,
        100,
        50,
        150,
      );

      const repositoryError = new Error('Database connection failed');
      jest
        .spyOn(mockUsageRepository, 'save')
        .mockRejectedValue(repositoryError);

      await expect(useCase.execute(command)).rejects.toThrow(
        UsageCollectionFailedError,
      );
    });

    it('should re-throw ApplicationError instances', async () => {
      const command = new CollectUsageCommand(
        userId,
        orgId,
        modelId,
        ModelProvider.OPENAI,
        requestId,
        100,
        50,
        150,
      );

      const appError = new InvalidUsageDataError('Test error');
      jest.spyOn(mockUsageRepository, 'save').mockRejectedValue(appError);

      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidUsageDataError,
      );
    });

    it('should handle cost calculation errors gracefully', async () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(true);

      jest
        .spyOn(mockModelsRepository, 'findOneLanguage')
        .mockRejectedValue(new Error('Model lookup failed'));

      const command = new CollectUsageCommand(
        userId,
        orgId,
        modelId,
        ModelProvider.OPENAI,
        requestId,
        100,
        50,
        150,
      );

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
