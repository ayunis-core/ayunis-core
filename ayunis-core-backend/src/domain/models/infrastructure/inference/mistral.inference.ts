import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mistral } from '@ayunis/provider-mistral';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { RuntimeInferenceHandler } from '../runtime/runtime-inference.handler';
import type { Model } from '../../domain/model.entity';
import { INFERENCE_MAX_RETRIES } from '../runtime/inference-config';

@Injectable()
export class MistralInferenceHandler extends RuntimeInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
  }

  protected createProvider(model: Model): ModelProvider {
    return mistral({
      apiKey: this.configService.get<string>('models.mistral.apiKey') ?? '',
      model: model.name,
      maxRetries: INFERENCE_MAX_RETRIES,
    });
  }
}
