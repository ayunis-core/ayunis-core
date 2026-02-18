import { ModelProviderInfoEntity } from '../../domain/model-provider-info.entity';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { ModelProviderLocation } from '../../domain/value-objects/model-provider-locations.enum';
import { ModelProviderInfoNotFoundError } from '../models.errors';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Extended provider configuration that includes the config key for API key lookup.
 */
export interface ModelProviderConfig extends ModelProviderInfoEntity {
  configKey: string;
}

const MODEL_PROVIDER_CONFIGS: ModelProviderConfig[] = [
  {
    provider: ModelProvider.OTC,
    displayName: 'Open Telekom Cloud',
    hostedIn: ModelProviderLocation.DE,
    configKey: 'models.otc.apiKey',
  },
  {
    provider: ModelProvider.OPENAI,
    displayName: 'OpenAI',
    hostedIn: ModelProviderLocation.US,
    configKey: 'models.openai.apiKey',
  },
  {
    provider: ModelProvider.ANTHROPIC,
    displayName: 'Anthropic',
    hostedIn: ModelProviderLocation.US,
    configKey: 'models.anthropic.apiKey',
  },
  {
    provider: ModelProvider.BEDROCK,
    displayName: 'AWS Bedrock',
    hostedIn: ModelProviderLocation.EU,
    configKey: 'models.bedrock.awsRegion',
  },
  {
    provider: ModelProvider.MISTRAL,
    displayName: 'Mistral',
    hostedIn: ModelProviderLocation.EU,
    configKey: 'models.mistral.apiKey',
  },
  {
    provider: ModelProvider.OLLAMA,
    displayName: 'Ollama',
    hostedIn: ModelProviderLocation.SELF_HOSTED,
    configKey: 'models.ollama.baseURL',
  },
  {
    provider: ModelProvider.SYNAFORCE,
    displayName: 'Ayunis Sovereign Cloud',
    hostedIn: ModelProviderLocation.AYUNIS,
    configKey: 'models.synaforce.baseURL',
  },
  {
    provider: ModelProvider.AYUNIS,
    displayName: 'Ayunis',
    hostedIn: ModelProviderLocation.AYUNIS,
    configKey: 'models.ayunis.baseURL',
  },
  {
    provider: ModelProvider.AZURE,
    displayName: 'MS Azure',
    hostedIn: ModelProviderLocation.EU,
    configKey: 'models.azure.apiKey',
  },
  {
    provider: ModelProvider.GEMINI,
    displayName: 'Google Gemini',
    hostedIn: ModelProviderLocation.US,
    configKey: 'models.gemini.apiKey',
  },
  {
    provider: ModelProvider.STACKIT,
    displayName: 'Stackit',
    hostedIn: ModelProviderLocation.DE,
    configKey: 'models.stackit.apiKey',
  },
];

@Injectable()
export class ModelProviderInfoRegistry {
  private readonly logger = new Logger(ModelProviderInfoRegistry.name);
  private readonly modelProviderConfigs: ModelProviderConfig[] =
    MODEL_PROVIDER_CONFIGS;

  public getModelProviderInfo(
    provider: ModelProvider,
  ): ModelProviderInfoEntity {
    const modelProviderConfig = this.modelProviderConfigs.find(
      (info) => info.provider === provider,
    );
    if (!modelProviderConfig) {
      this.logger.error(
        `Model provider info not found for provider: ${provider}`,
      );
      throw new ModelProviderInfoNotFoundError(provider);
    }
    return modelProviderConfig;
  }

  /**
   * Get the config key for looking up the API key/credentials for a provider.
   */
  public getConfigKey(provider: ModelProvider): string | undefined {
    const config = this.modelProviderConfigs.find(
      (c) => c.provider === provider,
    );
    return config?.configKey;
  }

  /**
   * Get all provider info entities.
   */
  public getAllProviderInfos(): ModelProviderInfoEntity[] {
    return this.modelProviderConfigs;
  }
}
