import { Injectable, Logger } from '@nestjs/common';
import { ModelProvider } from '../../domain/value-objects/model-provider.object';
import { ALL_MODELS } from '../constants/models-with-configs';
import { ModelNotFoundError } from '../models.errors';
import { ConfigService } from '@nestjs/config';
import { ModelWithConfig } from '../../domain/model-with-config.entity';
import { Model } from '../../domain/model.entity';

@Injectable()
export class ModelRegistry {
  private readonly logger = new Logger(ModelRegistry.name);
  private readonly modelsWithConfigs: ModelWithConfig[] = [];

  constructor(private readonly configService: ConfigService) {
    this.logger.log(ModelRegistry.name);
    this.modelsWithConfigs = ALL_MODELS;
  }

  private hasApiKeyForProvider(provider: ModelProvider): boolean {
    const providerConfigMap = {
      [ModelProvider.MISTRAL]: 'models.mistral.apiKey',
      [ModelProvider.OPENAI]: 'models.openai.apiKey',
      [ModelProvider.ANTHROPIC]: 'models.anthropic.apiKey',
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

  // getModelsForProvider(provider: ModelProvider): ModelWithConfig[] {
  //   this.logger.log('getModelsForProvider', provider);
  //   return this.modelsWithConfigs.filter((m) => m.model.provider === provider);
  // }

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

  getAvailableModel(
    modelName: string,
    modelProvider: ModelProvider,
  ): ModelWithConfig {
    this.logger.log('getModel', { modelName, modelProvider });
    const modelWithConfig = this.modelsWithConfigs.find(
      (m) => m.model.name === modelName && m.model.provider === modelProvider,
    );
    if (!modelWithConfig) {
      throw new ModelNotFoundError(modelName, modelProvider);
    }
    return modelWithConfig;
  }

  getModelWithConfig(
    modelName: string,
    modelProvider: ModelProvider,
  ): ModelWithConfig {
    this.logger.log('getModelWithConfig', { modelName, modelProvider });
    const modelWithConfig = this.modelsWithConfigs.find(
      (m) => m.model.name === modelName && m.model.provider === modelProvider,
    );
    if (!modelWithConfig) {
      throw new ModelNotFoundError(modelName, modelProvider);
    }
    return modelWithConfig;
  }
}
