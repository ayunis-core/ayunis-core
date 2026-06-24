import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { openai } from '@ayunis/provider-openai';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ThinkingTagStreamInferenceHandler } from '../runtime/thinking-tag-stream-inference.handler';
import type { Model } from '../../domain/model.entity';
import { INFERENCE_MAX_RETRIES } from '../runtime/inference-config';

@Injectable()
export class ScalewayStreamInferenceHandler extends ThinkingTagStreamInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
  }

  protected createProvider(model: Model): ModelProvider {
    return openai({
      apiKey: this.configService.get<string>('models.scaleway.apiKey') ?? '',
      baseUrl: this.configService.get<string>('models.scaleway.baseURL'),
      model: model.name,
      maxRetries: INFERENCE_MAX_RETRIES,
    });
  }
}
