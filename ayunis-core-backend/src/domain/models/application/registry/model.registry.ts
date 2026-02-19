import { Injectable, Logger } from '@nestjs/common';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { ModelNotFoundError } from '../models.errors';
import { ConfigService } from '@nestjs/config';
import { GetAllModelsUseCase } from '../use-cases/get-all-models/get-all-models.use-case';
import { UUID } from 'crypto';
import { Model } from '../../domain/model.entity';
import { ModelProviderInfoRegistry } from './model-provider-info.registry';

@Injectable()
export class ModelRegistry {
  private readonly logger = new Logger(ModelRegistry.name);
  private models: Model[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly getAllModelsUseCase: GetAllModelsUseCase,
    private readonly modelProviderInfoRegistry: ModelProviderInfoRegistry,
  ) {
    this.logger.log(ModelRegistry.name);
  }

  async onModuleInit(): Promise<void> {
    const models = await this.getAllModelsUseCase.execute();
    this.models = models;
  }

  private hasApiKeyForProvider(provider: ModelProvider): boolean {
    const configKey = this.modelProviderInfoRegistry.getConfigKey(provider);
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

  getAllAvailableModels(): Model[] {
    this.logger.log('getAllAvailableModels', {
      count: this.models.length,
    });
    return this.models.filter(
      (m) => m.isArchived === false && this.hasApiKeyForProvider(m.provider),
    );
  }

  getProviders(): readonly ModelProvider[] {
    const providers = Array.from(new Set(this.models.map((m) => m.provider)));
    return providers.filter((p) => this.hasApiKeyForProvider(p));
  }

  getAvailableModel(modelId: UUID): Model {
    this.logger.log('getModel', { modelId });
    const model = this.models.find(
      (m) => m.id === modelId && this.hasApiKeyForProvider(m.provider),
    );
    if (!model) {
      throw new ModelNotFoundError(modelId);
    }
    return model;
  }

  getModel(modelId: UUID): Model {
    return this.getAvailableModel(modelId);
  }
}
