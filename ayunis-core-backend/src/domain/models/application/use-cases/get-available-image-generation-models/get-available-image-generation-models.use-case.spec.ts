import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { ModelsRepository } from '../../ports/models.repository';
import { ModelProviderInfoRegistry } from '../../registry/model-provider-info.registry';
import { GetAvailableImageGenerationModelsQuery } from './get-available-image-generation-models.query';
import { GetAvailableImageGenerationModelsUseCase } from './get-available-image-generation-models.use-case';

describe('GetAvailableImageGenerationModelsUseCase', () => {
  let useCase: GetAvailableImageGenerationModelsUseCase;
  let modelsRepository: jest.Mocked<ModelsRepository>;
  let configService: jest.Mocked<ConfigService>;
  let mockContextService: { get: jest.Mock };

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    const mockModelsRepository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneLanguage: jest.fn(),
      findOneEmbedding: jest.fn(),
      findOneImageGeneration: jest.fn(),
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
          [ModelProvider.STACKIT]: 'models.stackit.apiKey',
          [ModelProvider.SCALEWAY]: 'models.scaleway.apiKey',
        };
        return configMap[provider];
      }),
      getModelProviderInfo: jest.fn(),
      getAllProviderInfos: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAvailableImageGenerationModelsUseCase,
        { provide: ModelsRepository, useValue: mockModelsRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: ModelProviderInfoRegistry,
          useValue: mockModelProviderInfoRegistry,
        },
      ],
    }).compile();

    useCase = module.get<GetAvailableImageGenerationModelsUseCase>(
      GetAvailableImageGenerationModelsUseCase,
    );
    modelsRepository = module.get(ModelsRepository);
    configService = module.get(ConfigService);

    mockContextService.get.mockImplementation((key: string) => {
      if (key === 'orgId') return mockOrgId;
      if (key === 'role') return UserRole.ADMIN;
      if (key === 'systemRole') return null;
      return null;
    });

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns only non-archived image-generation models with configured providers', async () => {
    const query = new GetAvailableImageGenerationModelsQuery(mockOrgId);
    const availableImageModel = new ImageGenerationModel({
      id: '123e4567-e89b-12d3-a456-426614174001' as UUID,
      name: 'gpt-image-1',
      displayName: 'GPT Image 1',
      provider: ModelProvider.AZURE,
      isArchived: false,
    });
    const archivedImageModel = new ImageGenerationModel({
      id: '123e4567-e89b-12d3-a456-426614174002' as UUID,
      name: 'archived-image-model',
      displayName: 'Archived image model',
      provider: ModelProvider.AZURE,
      isArchived: true,
    });
    const languageModel = new LanguageModel({
      id: '123e4567-e89b-12d3-a456-426614174003' as UUID,
      name: 'gpt-4.1',
      displayName: 'GPT 4.1',
      provider: ModelProvider.OPENAI,
      canStream: true,
      canUseTools: true,
      canVision: true,
      isReasoning: false,
      isArchived: false,
    });

    modelsRepository.findAll.mockResolvedValue([
      availableImageModel,
      archivedImageModel,
      languageModel,
    ]);
    configService.get.mockImplementation((key: string) =>
      key === 'models.azure.apiKey' ? 'azure-key' : '',
    );

    const result = await useCase.execute(query);

    expect(result).toStrictEqual([availableImageModel]);
  });

  it('rejects non-admin callers', async () => {
    const query = new GetAvailableImageGenerationModelsQuery(mockOrgId);
    mockContextService.get.mockImplementation((key: string) => {
      if (key === 'role') return UserRole.USER;
      if (key === 'systemRole') return null;
      return null;
    });

    await expect(useCase.execute(query)).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(modelsRepository.findAll).not.toHaveBeenCalled();
  });
});
