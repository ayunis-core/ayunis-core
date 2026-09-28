import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { anthropic } from '@ayunis/provider-anthropic';
import type { ModelProvider } from '@ayunis/inference';
import { RuntimeInferenceProviderFactory } from 'src/domain/models/infrastructure/runtime/runtime-inference-provider.factory';
import type { Model } from 'src/domain/models/domain/model.entity';
import {
  CLAUDE_MAX_OUTPUT_TOKENS,
  PROVIDER_SDK_MAX_RETRIES,
} from 'src/domain/models/infrastructure/runtime/inference-config';

@Injectable()
export class AnthropicInferenceProviderFactory extends RuntimeInferenceProviderFactory {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  protected createProvider(model: Model): ModelProvider {
    return anthropic({
      apiKey: this.configService.get<string>('models.anthropic.apiKey') ?? '',
      model: model.name,
      maxRetries: PROVIDER_SDK_MAX_RETRIES,
      maxTokens: CLAUDE_MAX_OUTPUT_TOKENS,
    });
  }
}
