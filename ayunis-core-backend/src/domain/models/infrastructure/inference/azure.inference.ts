import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { azure } from '@ayunis/provider-openai';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { RuntimeInferenceHandler } from '../runtime/runtime-inference.handler';
import type { Model } from '../../domain/model.entity';
import { INFERENCE_MAX_RETRIES } from '../runtime/inference-config';

@Injectable()
export class AzureInferenceHandler extends RuntimeInferenceHandler {
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
      apiVersion:
        this.configService.get<string>('models.azure.apiVersion') ?? '',
      model: model.name,
      maxRetries: INFERENCE_MAX_RETRIES,
    });
  }
}
