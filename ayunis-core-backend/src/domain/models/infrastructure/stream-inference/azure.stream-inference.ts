import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { azure } from '@ayunis/provider-openai';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { RuntimeStreamInferenceHandler } from 'src/domain/models/infrastructure/runtime/runtime-stream-inference.handler';
import type { Model } from 'src/domain/models/domain/model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { STREAMING_PROVIDER_MAX_RETRIES } from 'src/domain/models/infrastructure/runtime/inference-config';

@Injectable()
export class AzureStreamInferenceHandler extends RuntimeStreamInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
  }

  protected createProvider(model: Model): ModelProvider {
    return azure({
      apiKey: this.configService.get<string>('models.azure.apiKey') ?? '',
      endpoint: this.configService.get<string>('models.azure.endpoint') ?? '',
      model: model.name,
      reasoningEffort:
        model instanceof LanguageModel && model.isReasoning ? 'low' : undefined,
      // Host streaming boundaries own retries; nested provider retries would
      // multiply each explicit attempt and obscure the real request budget.
      maxRetries: STREAMING_PROVIDER_MAX_RETRIES,
    });
  }
}
