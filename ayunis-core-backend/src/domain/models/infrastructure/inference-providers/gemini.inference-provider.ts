import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { gemini } from '@ayunis/provider-gemini';
import type { ModelProvider } from '@ayunis/inference';
import { RuntimeInferenceProviderFactory } from 'src/domain/models/infrastructure/runtime/runtime-inference-provider.factory';
import type { Model } from 'src/domain/models/domain/model.entity';
import { PROVIDER_SDK_MAX_RETRIES } from 'src/domain/models/infrastructure/runtime/inference-config';

@Injectable()
export class GeminiInferenceProviderFactory extends RuntimeInferenceProviderFactory {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  protected createProvider(model: Model): ModelProvider {
    return gemini({
      apiKey: this.configService.get<string>('models.gemini.apiKey') ?? '',
      model: model.name,
      maxRetries: PROVIDER_SDK_MAX_RETRIES,
    });
  }
}
