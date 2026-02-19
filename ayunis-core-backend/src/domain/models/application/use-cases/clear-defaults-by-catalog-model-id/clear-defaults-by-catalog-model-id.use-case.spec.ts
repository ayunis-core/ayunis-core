import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ClearDefaultsByCatalogModelIdUseCase } from './clear-defaults-by-catalog-model-id.use-case';
import { ClearDefaultsByCatalogModelIdCommand } from './clear-defaults-by-catalog-model-id.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { UUID } from 'crypto';

describe('ClearDefaultsByCatalogModelIdUseCase', () => {
  let useCase: ClearDefaultsByCatalogModelIdUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let userDefaultModelsRepository: jest.Mocked<UserDefaultModelsRepository>;

  const mockCatalogModelId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockOrgId1 = '123e4567-e89b-12d3-a456-426614174100' as UUID;
  const mockOrgId2 = '123e4567-e89b-12d3-a456-426614174101' as UUID;
  const mockPermittedModelId1 = '123e4567-e89b-12d3-a456-426614174200' as UUID;
  const mockPermittedModelId2 = '123e4567-e89b-12d3-a456-426614174201' as UUID;

  beforeEach(async () => {
    const mockPermittedModelsRepository = {
      findAllByCatalogModelId: jest.fn(),
      unsetDefaultsByCatalogModelId: jest.fn(),
      findAll: jest.fn(),
      findOrgDefaultLanguage: jest.fn(),
      findOne: jest.fn(),
      findOneLanguage: jest.fn(),
      findOneEmbedding: jest.fn(),
      findManyLanguage: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      setAsDefault: jest.fn(),
      update: jest.fn(),
    };

    const mockUserDefaultModelsRepository = {
      deleteByPermittedModelIds: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      setAsDefault: jest.fn(),
      delete: jest.fn(),
      deleteByModelId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClearDefaultsByCatalogModelIdUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: mockPermittedModelsRepository,
        },
        {
          provide: UserDefaultModelsRepository,
          useValue: mockUserDefaultModelsRepository,
        },
      ],
    }).compile();

    useCase = module.get<ClearDefaultsByCatalogModelIdUseCase>(
      ClearDefaultsByCatalogModelIdUseCase,
    );
    permittedModelsRepository = module.get(PermittedModelsRepository);
    userDefaultModelsRepository = module.get(UserDefaultModelsRepository);

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockLanguageModel = (id: UUID): LanguageModel => {
    return new LanguageModel({
      id,
      name: 'gpt-4',
      displayName: 'GPT-4',
      provider: ModelProvider.OPENAI,
      canStream: true,
      isReasoning: false,
      isArchived: false,
      canUseTools: true,
      canVision: false,
    });
  };

  const createMockPermittedModel = (
    id: UUID,
    orgId: UUID,
    model: LanguageModel,
    isDefault = false,
  ): PermittedModel => {
    return new PermittedModel({
      id,
      model,
      orgId,
      isDefault,
    });
  };

  describe('execute', () => {
    it('should find permitted models by catalog model ID', async () => {
      // Arrange
      const command = new ClearDefaultsByCatalogModelIdCommand(
        mockCatalogModelId,
      );
      const mockModel = createMockLanguageModel(mockCatalogModelId);
      const mockPermittedModels = [
        createMockPermittedModel(
          mockPermittedModelId1,
          mockOrgId1,
          mockModel,
          true,
        ),
        createMockPermittedModel(
          mockPermittedModelId2,
          mockOrgId2,
          mockModel,
          true,
        ),
      ];

      permittedModelsRepository.findAllByCatalogModelId.mockResolvedValue(
        mockPermittedModels,
      );
      userDefaultModelsRepository.deleteByPermittedModelIds.mockResolvedValue();
      permittedModelsRepository.unsetDefaultsByCatalogModelId.mockResolvedValue();

      // Act
      await useCase.execute(command);

      // Assert
      expect(
        permittedModelsRepository.findAllByCatalogModelId,
      ).toHaveBeenCalledWith(mockCatalogModelId);
    });

    it('should delete user defaults for all permitted models referencing the catalog model', async () => {
      // Arrange
      const command = new ClearDefaultsByCatalogModelIdCommand(
        mockCatalogModelId,
      );
      const mockModel = createMockLanguageModel(mockCatalogModelId);
      const mockPermittedModels = [
        createMockPermittedModel(
          mockPermittedModelId1,
          mockOrgId1,
          mockModel,
          true,
        ),
        createMockPermittedModel(
          mockPermittedModelId2,
          mockOrgId2,
          mockModel,
          false,
        ),
      ];

      permittedModelsRepository.findAllByCatalogModelId.mockResolvedValue(
        mockPermittedModels,
      );
      userDefaultModelsRepository.deleteByPermittedModelIds.mockResolvedValue();
      permittedModelsRepository.unsetDefaultsByCatalogModelId.mockResolvedValue();

      // Act
      await useCase.execute(command);

      // Assert
      expect(
        userDefaultModelsRepository.deleteByPermittedModelIds,
      ).toHaveBeenCalledWith([mockPermittedModelId1, mockPermittedModelId2]);
    });

    it('should unset org defaults for all permitted models using the catalog model', async () => {
      // Arrange
      const command = new ClearDefaultsByCatalogModelIdCommand(
        mockCatalogModelId,
      );
      const mockModel = createMockLanguageModel(mockCatalogModelId);
      const mockPermittedModels = [
        createMockPermittedModel(
          mockPermittedModelId1,
          mockOrgId1,
          mockModel,
          true,
        ),
      ];

      permittedModelsRepository.findAllByCatalogModelId.mockResolvedValue(
        mockPermittedModels,
      );
      userDefaultModelsRepository.deleteByPermittedModelIds.mockResolvedValue();
      permittedModelsRepository.unsetDefaultsByCatalogModelId.mockResolvedValue();

      // Act
      await useCase.execute(command);

      // Assert
      expect(
        permittedModelsRepository.unsetDefaultsByCatalogModelId,
      ).toHaveBeenCalledWith(mockCatalogModelId);
    });

    it('should be a no-op when no permitted models exist for the catalog model', async () => {
      // Arrange
      const command = new ClearDefaultsByCatalogModelIdCommand(
        mockCatalogModelId,
      );

      permittedModelsRepository.findAllByCatalogModelId.mockResolvedValue([]);

      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      // Act
      await useCase.execute(command);

      // Assert
      expect(
        permittedModelsRepository.findAllByCatalogModelId,
      ).toHaveBeenCalledWith(mockCatalogModelId);
      expect(
        userDefaultModelsRepository.deleteByPermittedModelIds,
      ).not.toHaveBeenCalled();
      expect(
        permittedModelsRepository.unsetDefaultsByCatalogModelId,
      ).not.toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalledWith(
        'No permitted models found for catalog model',
        { catalogModelId: mockCatalogModelId },
      );
    });

    it('should execute operations in correct order: find, delete user defaults, then unset org defaults', async () => {
      // Arrange
      const command = new ClearDefaultsByCatalogModelIdCommand(
        mockCatalogModelId,
      );
      const mockModel = createMockLanguageModel(mockCatalogModelId);
      const mockPermittedModels = [
        createMockPermittedModel(
          mockPermittedModelId1,
          mockOrgId1,
          mockModel,
          true,
        ),
      ];

      const callOrder: string[] = [];

      permittedModelsRepository.findAllByCatalogModelId.mockImplementation(
        async () => {
          callOrder.push('findAllByCatalogModelId');
          return mockPermittedModels;
        },
      );
      userDefaultModelsRepository.deleteByPermittedModelIds.mockImplementation(
        async () => {
          callOrder.push('deleteByPermittedModelIds');
        },
      );
      permittedModelsRepository.unsetDefaultsByCatalogModelId.mockImplementation(
        async () => {
          callOrder.push('unsetDefaultsByCatalogModelId');
        },
      );

      // Act
      await useCase.execute(command);

      // Assert
      expect(callOrder).toEqual([
        'findAllByCatalogModelId',
        'deleteByPermittedModelIds',
        'unsetDefaultsByCatalogModelId',
      ]);
    });

    it('should log appropriate messages during execution', async () => {
      // Arrange
      const command = new ClearDefaultsByCatalogModelIdCommand(
        mockCatalogModelId,
      );
      const mockModel = createMockLanguageModel(mockCatalogModelId);
      const mockPermittedModels = [
        createMockPermittedModel(
          mockPermittedModelId1,
          mockOrgId1,
          mockModel,
          true,
        ),
        createMockPermittedModel(
          mockPermittedModelId2,
          mockOrgId2,
          mockModel,
          false,
        ),
      ];

      permittedModelsRepository.findAllByCatalogModelId.mockResolvedValue(
        mockPermittedModels,
      );
      userDefaultModelsRepository.deleteByPermittedModelIds.mockResolvedValue();
      permittedModelsRepository.unsetDefaultsByCatalogModelId.mockResolvedValue();

      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      // Act
      await useCase.execute(command);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        'Clearing defaults for archived catalog model',
        { catalogModelId: mockCatalogModelId },
      );
      expect(debugSpy).toHaveBeenCalledWith(
        'Found permitted models to clear defaults',
        {
          catalogModelId: mockCatalogModelId,
          permittedModelCount: 2,
        },
      );
      expect(logSpy).toHaveBeenCalledWith(
        'Successfully cleared all defaults for archived catalog model',
        {
          catalogModelId: mockCatalogModelId,
          affectedPermittedModels: 2,
        },
      );
    });
  });
});
