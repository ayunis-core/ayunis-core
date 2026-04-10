import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { UUID } from 'crypto';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import { ModelsRepository } from '../../ports/models.repository';
import { ModelProviderInfoRegistry } from '../../registry/model-provider-info.registry';
import { GetConfiguredModelsByTypeQuery } from './get-configured-models-by-type.query';
import { GetConfiguredModelsByTypeUseCase } from './get-configured-models-by-type.use-case';

describe('GetConfiguredModelsByTypeUseCase', () => {
  let useCase: GetConfiguredModelsByTypeUseCase;
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
        GetConfiguredModelsByTypeUseCase,
        { provide: ModelsRepository, useValue: mockModelsRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: ModelProviderInfoRegistry,
          useValue: mockModelProviderInfoRegistry,
        },
      ],
    }).compile();

    useCase = module.get<GetConfiguredModelsByTypeUseCase>(
      GetConfiguredModelsByTypeUseCase,
    );
    modelsRepository = module.get(ModelsRepository);
    configService = module.get(ConfigService);

    mockContextService.get.mockImplementation((key: string) => {
      if (key === 'userId') return 'test-user-id';
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

  it('returns only language models when type is LANGUAGE', async () => {
    const query = new GetConfiguredModelsByTypeQuery(
      mockOrgId,
      ModelType.LANGUAGE,
    );
    const languageModel = new LanguageModel({
      id: '123e4567-e89b-12d3-a456-426614174001' as UUID,
      name: 'gpt-4',
      displayName: 'gpt-4',
      provider: ModelProvider.OPENAI,
      canStream: true,
      isReasoning: false,
      isArchived: false,
      canUseTools: true,
      canVision: false,
    });
    const imageModel = new ImageGenerationModel({
      id: '123e4567-e89b-12d3-a456-426614174002' as UUID,
      name: 'gpt-image-1',
      displayName: 'GPT Image 1',
      provider: ModelProvider.AZURE,
      isArchived: false,
    });

    modelsRepository.findAll.mockResolvedValue([languageModel, imageModel]);
    configService.get.mockReturnValue('fake-key');

    const result = await useCase.execute(query);

    expect(result).toStrictEqual([languageModel]);
  });

  it('returns only embedding models when type is EMBEDDING', async () => {
    const query = new GetConfiguredModelsByTypeQuery(
      mockOrgId,
      ModelType.EMBEDDING,
    );
    const embeddingModel = new EmbeddingModel({
      id: '123e4567-e89b-12d3-a456-426614174001' as UUID,
      name: 'text-embedding-3-small',
      displayName: 'Text Embedding 3 Small',
      provider: ModelProvider.OPENAI,
      isArchived: false,
      dimensions: EmbeddingDimensions.DIMENSION_1536,
    });
    const languageModel = new LanguageModel({
      id: '123e4567-e89b-12d3-a456-426614174002' as UUID,
      name: 'gpt-4',
      displayName: 'gpt-4',
      provider: ModelProvider.OPENAI,
      canStream: true,
      isReasoning: false,
      isArchived: false,
      canUseTools: true,
      canVision: false,
    });

    modelsRepository.findAll.mockResolvedValue([embeddingModel, languageModel]);
    configService.get.mockReturnValue('fake-key');

    const result = await useCase.execute(query);

    expect(result).toStrictEqual([embeddingModel]);
  });

  it('returns only image-generation models when type is IMAGE_GENERATION', async () => {
    const query = new GetConfiguredModelsByTypeQuery(
      mockOrgId,
      ModelType.IMAGE_GENERATION,
    );
    const imageModel = new ImageGenerationModel({
      id: '123e4567-e89b-12d3-a456-426614174001' as UUID,
      name: 'gpt-image-1',
      displayName: 'GPT Image 1',
      provider: ModelProvider.AZURE,
      isArchived: false,
    });
    const languageModel = new LanguageModel({
      id: '123e4567-e89b-12d3-a456-426614174002' as UUID,
      name: 'gpt-4',
      displayName: 'gpt-4',
      provider: ModelProvider.OPENAI,
      canStream: true,
      isReasoning: false,
      isArchived: false,
      canUseTools: true,
      canVision: false,
    });

    modelsRepository.findAll.mockResolvedValue([imageModel, languageModel]);
    configService.get.mockReturnValue('fake-key');

    const result = await useCase.execute(query);

    expect(result).toStrictEqual([imageModel]);
  });

  it('excludes archived models', async () => {
    const query = new GetConfiguredModelsByTypeQuery(
      mockOrgId,
      ModelType.LANGUAGE,
    );
    const activeModel = new LanguageModel({
      id: '123e4567-e89b-12d3-a456-426614174001' as UUID,
      name: 'gpt-4',
      displayName: 'gpt-4',
      provider: ModelProvider.OPENAI,
      canStream: true,
      isReasoning: false,
      isArchived: false,
      canUseTools: true,
      canVision: false,
    });
    const archivedModel = new LanguageModel({
      id: '123e4567-e89b-12d3-a456-426614174002' as UUID,
      name: 'legacy-model',
      displayName: 'legacy-model',
      provider: ModelProvider.OPENAI,
      canStream: true,
      isReasoning: false,
      isArchived: true,
      canUseTools: false,
      canVision: false,
    });

    modelsRepository.findAll.mockResolvedValue([activeModel, archivedModel]);
    configService.get.mockReturnValue('fake-key');

    const result = await useCase.execute(query);

    expect(result).toStrictEqual([activeModel]);
  });

  it('excludes models without API keys', async () => {
    const query = new GetConfiguredModelsByTypeQuery(
      mockOrgId,
      ModelType.LANGUAGE,
    );
    const modelWithKey = new LanguageModel({
      id: '123e4567-e89b-12d3-a456-426614174001' as UUID,
      name: 'gpt-4',
      displayName: 'gpt-4',
      provider: ModelProvider.OPENAI,
      canStream: true,
      isReasoning: false,
      isArchived: false,
      canUseTools: true,
      canVision: false,
    });
    const modelWithoutKey = new LanguageModel({
      id: '123e4567-e89b-12d3-a456-426614174002' as UUID,
      name: 'claude-3-opus',
      displayName: 'claude-3-opus',
      provider: ModelProvider.ANTHROPIC,
      canStream: true,
      isReasoning: false,
      isArchived: false,
      canUseTools: true,
      canVision: false,
    });

    modelsRepository.findAll.mockResolvedValue([modelWithKey, modelWithoutKey]);
    configService.get.mockImplementation((configKey: string) => {
      if (configKey === 'models.openai.apiKey') {
        return 'openai-key';
      }
      return undefined;
    });

    const result = await useCase.execute(query);

    expect(result).toStrictEqual([modelWithKey]);
  });

  it('rejects non-admin callers', async () => {
    const query = new GetConfiguredModelsByTypeQuery(
      mockOrgId,
      ModelType.LANGUAGE,
    );
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

  it('returns empty array when no models match the type', async () => {
    const query = new GetConfiguredModelsByTypeQuery(
      mockOrgId,
      ModelType.IMAGE_GENERATION,
    );

    modelsRepository.findAll.mockResolvedValue([]);

    const result = await useCase.execute(query);

    expect(result).toEqual([]);
  });
});
