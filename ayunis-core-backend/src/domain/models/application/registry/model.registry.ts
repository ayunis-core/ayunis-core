import { Injectable, Logger } from '@nestjs/common';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { ModelNotFoundError } from '../models.errors';
import { ConfigService } from '@nestjs/config';
import { ModelWithConfig } from '../../domain/model-with-config.entity';
import { GetAllModelsUseCase } from '../use-cases/get-all-models/get-all-models.use-case';
import { UUID } from 'crypto';

@Injectable()
export class ModelRegistry {
  private readonly logger = new Logger(ModelRegistry.name);
  private modelsWithConfigs: ModelWithConfig[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly getAllModelsUseCase: GetAllModelsUseCase,
  ) {
    this.logger.log(ModelRegistry.name);
  }

  async onModuleInit(): Promise<void> {
    const models = await this.getAllModelsUseCase.execute();
    this.modelsWithConfigs = models;
  }

  private hasApiKeyForProvider(provider: ModelProvider): boolean {
    const providerConfigMap = {
      [ModelProvider.MISTRAL]: 'models.mistral.apiKey',
      [ModelProvider.OPENAI]: 'models.openai.apiKey',
      [ModelProvider.ANTHROPIC]: 'models.anthropic.apiKey',
      [ModelProvider.OLLAMA]: 'models.ollama.baseURL',
    };

    const configKey = providerConfigMap[provider];
    if (!configKey) {
      this.logger.warn(`No config mapping found for provider: ${provider}`);
      return false;
    }

    const apiKey = this.configService.get<string>(configKey);
    const hasKey = !!apiKey && apiKey.trim() !== '';

    this.logger.debug(`API key check for ${provider}:`, {
      hasKey,
      configKey,
      keyLength: apiKey ? apiKey.length : 0,
    });

    return hasKey;
  }

  getAllAvailableModels(): ModelWithConfig[] {
    this.logger.log('getAllAvailableModels', {
      count: this.modelsWithConfigs.length,
    });
    return this.modelsWithConfigs.filter(
      (m) =>
        m.config.isArchived === false &&
        this.hasApiKeyForProvider(m.model.provider),
    );
  }

  getProviders(): readonly ModelProvider[] {
    const providers = Array.from(
      new Set(this.modelsWithConfigs.map((m) => m.model.provider)),
    );
    return providers.filter((p) => this.hasApiKeyForProvider(p));
  }

  getAvailableModel(modelId: UUID): ModelWithConfig {
    this.logger.log('getModel', { modelId });
    const modelWithConfig = this.modelsWithConfigs.find(
      (m) =>
        m.model.id === modelId && this.hasApiKeyForProvider(m.model.provider),
    );
    if (!modelWithConfig) {
      throw new ModelNotFoundError(modelId);
    }
    return modelWithConfig;
  }

  getModelWithConfig(modelId: UUID): ModelWithConfig {
    this.logger.log('getModelWithConfig', { modelId });
    const modelWithConfig = this.modelsWithConfigs.find(
      (m) =>
        m.model.id === modelId && this.hasApiKeyForProvider(m.model.provider),
    );
    if (!modelWithConfig) {
      throw new ModelNotFoundError(modelId);
    }
    return modelWithConfig;
  }
}
