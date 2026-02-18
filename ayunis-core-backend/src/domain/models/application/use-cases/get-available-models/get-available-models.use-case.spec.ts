import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { GetAvailableModelsUseCase } from './get-available-models.use-case';
import { GetAvailableModelsQuery } from './get-available-models.query';
import { ModelsRepository } from '../../ports/models.repository';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { UUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ModelProviderInfoRegistry } from '../../registry/model-provider-info.registry';

describe('GetAvailableModelsUseCase', () => {
  let useCase: GetAvailableModelsUseCase;
  let modelsRepository: jest.Mocked<ModelsRepository>;
  let configService: jest.Mocked<ConfigService>;
  let mockContextService: any;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    const mockModelsRepository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneLanguage: jest.fn(),
      findOneEmbedding: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    mockContextService = {
      get: jest.fn(),
    };

    const mockModelProviderInfoRegistry = {
      getConfigKey: jest.fn().mockImplementation((provider: ModelProvider) => {
        const configMap: Record<ModelProvider, string> = {
          [ModelProvider.OTC]: 'models.otc.apiKey',
          [ModelProvider.OPENAI]: 'models.openai.apiKey',
          [ModelProvider.ANTHROPIC]: 'models.anthropic.apiKey',
          [ModelProvider.BEDROCK]: 'models.bedrock.awsRegion',
          [ModelProvider.MISTRAL]: 'models.mistral.apiKey',
          [ModelProvider.OLLAMA]: 'models.ollama.baseURL',
          [ModelProvider.SYNAFORCE]: 'models.synaforce.baseURL',
          [ModelProvider.AYUNIS]: 'models.ayunis.baseURL',
          [ModelProvider.AZURE]: 'models.azure.apiKey',
          [ModelProvider.GEMINI]: 'models.gemini.apiKey',
        };
        return configMap[provider];
      }),
      getModelProviderInfo: jest.fn(),
      getAllProviderInfos: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAvailableModelsUseCase,
        { provide: ModelsRepository, useValue: mockModelsRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: ModelProviderInfoRegistry,
          useValue: mockModelProviderInfoRegistry,
        },
      ],
    }).compile();

    useCase = module.get<GetAvailableModelsUseCase>(GetAvailableModelsUseCase);
    modelsRepository = module.get(ModelsRepository);
    configService = module.get(ConfigService);

    // Configure ContextService mock
    mockContextService.get.mockImplementation((key: string) => {
      if (key === 'userId') return 'test-user-id';
      if (key === 'orgId') return mockOrgId;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'systemRole') return null;
      return null;
    });

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return all available models from repository', async () => {
      // Arrange
      const query = new GetAvailableModelsQuery(mockOrgId);

      const mockModels = [
        new LanguageModel({
          id: '123e4567-e89b-12d3-a456-426614174001' as UUID,
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
          canUseTools: true,
          canVision: false,
        }),
        new LanguageModel({
          id: '123e4567-e89b-12d3-a456-426614174002' as UUID,
          name: 'claude-3-sonnet',
          displayName: 'claude-3-sonnet',
          provider: ModelProvider.ANTHROPIC,
          canStream: true,
          isReasoning: false,
          isArchived: false,
          canUseTools: true,
          canVision: false,
        }),
      ];

      modelsRepository.findAll.mockResolvedValue(mockModels);
      configService.get.mockReturnValue('fake-key');

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(modelsRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toStrictEqual(mockModels);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no models are available', async () => {
      // Arrange
      const query = new GetAvailableModelsQuery(mockOrgId);

      modelsRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(modelsRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should log the query details', async () => {
      // Arrange
      const query = new GetAvailableModelsQuery(mockOrgId);

      const mockModels = [
        new LanguageModel({
          id: '123e4567-e89b-12d3-a456-426614174001' as UUID,
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
          canUseTools: true,
          canVision: false,
        }),
      ];

      modelsRepository.findAll.mockResolvedValue(mockModels);
      configService.get.mockReturnValue('fake-key');

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(query);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('getAvailableModels', query);
    });

    it('should log debug information about all models', async () => {
      // Arrange
      const query = new GetAvailableModelsQuery(mockOrgId);

      const mockModels = [
        new LanguageModel({
          id: '123e4567-e89b-12d3-a456-426614174001' as UUID,
          name: 'gpt-4',
          displayName: 'gpt-4',
          provider: ModelProvider.OPENAI,
          canStream: true,
          isReasoning: false,
          isArchived: false,
          canUseTools: true,
          canVision: false,
        }),
      ];

      modelsRepository.findAll.mockResolvedValue(mockModels);
      configService.get.mockReturnValue('fake-key');

      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      // Act
      await useCase.execute(query);

      // Assert
      expect(debugSpy).toHaveBeenCalledWith('All available models', {
        allModels: mockModels,
      });
    });

    it('should filter out archived models and those without provider config', async () => {
      const query = new GetAvailableModelsQuery(mockOrgId);
      const activeModel = new LanguageModel({
        id: '123e4567-e89b-12d3-a456-426614174003' as UUID,
        name: 'gpt-4o',
        displayName: 'gpt-4o',
        provider: ModelProvider.OPENAI,
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: true,
        canVision: false,
      });
      const archivedModel = new LanguageModel({
        id: '123e4567-e89b-12d3-a456-426614174004' as UUID,
        name: 'legacy-model',
        displayName: 'legacy-model',
        provider: ModelProvider.OPENAI,
        canStream: true,
        isReasoning: false,
        isArchived: true,
        canUseTools: false,
        canVision: false,
      });
      const missingConfigModel = new LanguageModel({
        id: '123e4567-e89b-12d3-a456-426614174005' as UUID,
        name: 'claude-3-opus',
        displayName: 'claude-3-opus',
        provider: ModelProvider.ANTHROPIC,
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: true,
        canVision: false,
      });

      modelsRepository.findAll.mockResolvedValue([
        activeModel,
        archivedModel,
        missingConfigModel,
      ]);

      configService.get.mockImplementation((configKey: string) => {
        if (configKey === 'models.openai.apiKey') {
          return 'openai-key';
        }
        return undefined;
      });

      const result = await useCase.execute(query);

      expect(result).toEqual([activeModel]);
    });
  });
});
