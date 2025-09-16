import { ModelProviderInfoEntity } from '../../domain/model-provider-info.entity';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { ModelProviderLocation } from '../../domain/value-objects/model-provider-locations.enum';
import { ModelProviderInfoNotFoundError } from '../models.errors';
import { Injectable, Logger } from '@nestjs/common';

const MODEL_PROVIDER_INFOS: ModelProviderInfoEntity[] = [
  {
    provider: ModelProvider.OPENAI,
    displayName: 'OpenAI',
    hostedIn: ModelProviderLocation.US,
  },
  {
    provider: ModelProvider.ANTHROPIC,
    displayName: 'Anthropic',
    hostedIn: ModelProviderLocation.US,
  },
  {
    provider: ModelProvider.MISTRAL,
    displayName: 'Mistral',
    hostedIn: ModelProviderLocation.EU,
  },
  {
    provider: ModelProvider.OLLAMA,
    displayName: 'Ollama',
    hostedIn: ModelProviderLocation.SELF_HOSTED,
  },
  {
    provider: ModelProvider.SYNAFORCE,
    displayName: 'Ayunis Sovereign Cloud',
    hostedIn: ModelProviderLocation.AYUNIS,
  },
  {
    provider: ModelProvider.AYUNIS,
    displayName: 'Ayunis',
    hostedIn: ModelProviderLocation.AYUNIS,
  },
];

@Injectable()
export class ModelProviderInfoRegistry {
  private readonly logger = new Logger(ModelProviderInfoRegistry.name);
  private readonly modelProviderInfos: ModelProviderInfoEntity[] =
    MODEL_PROVIDER_INFOS;

  public getModelProviderInfo(
    provider: ModelProvider,
  ): ModelProviderInfoEntity {
    const modelProviderInfo = this.modelProviderInfos.find(
      (info) => info.provider === provider,
    );
    if (!modelProviderInfo) {
      this.logger.error(
        `Model provider info not found for provider: ${provider}`,
      );
      throw new ModelProviderInfoNotFoundError(provider);
    }
    return modelProviderInfo;
  }
}
