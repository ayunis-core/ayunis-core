import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ollama } from '@ayunis/provider-ollama';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ThinkingTagInferenceHandler } from '../runtime/thinking-tag-inference.handler';
import type { Model } from '../../domain/model.entity';
import { INFERENCE_MAX_RETRIES } from '../runtime/inference-config';

@Injectable()
export class AyunisOllamaInferenceHandler extends ThinkingTagInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
  }

  protected createProvider(model: Model): ModelProvider {
    return ollama({
      baseUrl: this.configService.get<string>('models.ayunis.baseURL') ?? '',
      model: model.name,
      headers: {
        Authorization: `Bearer ${this.configService.get<string>('models.ayunis.authToken') ?? ''}`,
      },
      maxRetries: INFERENCE_MAX_RETRIES,
    });
  }
}
