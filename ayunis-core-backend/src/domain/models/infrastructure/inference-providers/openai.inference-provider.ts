import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { openai } from '@ayunis/provider-openai';
import type { ModelProvider } from '@ayunis/inference';
import { RuntimeInferenceProviderFactory } from 'src/domain/models/infrastructure/runtime/runtime-inference-provider.factory';
import type { Model } from 'src/domain/models/domain/model.entity';
import { PROVIDER_SDK_MAX_RETRIES } from 'src/domain/models/infrastructure/runtime/inference-config';

@Injectable()
export class OpenAIInferenceProviderFactory extends RuntimeInferenceProviderFactory {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  protected createProvider(model: Model): ModelProvider {
    return openai({
      apiKey: this.configService.get<string>('models.openai.apiKey') ?? '',
      model: model.name,
      maxRetries: PROVIDER_SDK_MAX_RETRIES,
    });
  }
}
