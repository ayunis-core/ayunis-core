import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { azure } from '@ayunis/provider-openai';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { RuntimeStreamInferenceHandler } from 'src/domain/models/infrastructure/runtime/runtime-stream-inference.handler';
import type { Model } from 'src/domain/models/domain/model.entity';

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
      // Azure retries are owned by the host streaming boundaries. Leaving
      // OpenAI SDK retries enabled multiplies each explicit attempt and made
      // exhausted incidents perform up to eight provider requests (AYC-849).
      maxRetries: 0,
    });
  }
}
