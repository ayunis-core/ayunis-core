import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ollama } from '@ayunis/provider-ollama';
import type { ModelProvider } from '@ayunis/inference';
import { ThinkingTagInferenceProviderFactory } from 'src/domain/models/infrastructure/runtime/thinking-tag-inference-provider.factory';
import type { Model } from 'src/domain/models/domain/model.entity';
import { PROVIDER_SDK_MAX_RETRIES } from 'src/domain/models/infrastructure/runtime/inference-config';

@Injectable()
export class LocalOllamaInferenceProviderFactory extends ThinkingTagInferenceProviderFactory {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  protected createProvider(model: Model): ModelProvider {
    return ollama({
      baseUrl: this.configService.get<string>('models.ollama.baseURL') ?? '',
      model: model.name,
      maxRetries: PROVIDER_SDK_MAX_RETRIES,
    });
  }
}
