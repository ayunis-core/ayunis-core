import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { openai } from '@ayunis/provider-openai';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ThinkingTagInferenceHandler } from '../runtime/thinking-tag-inference.handler';
import type { Model } from '../../domain/model.entity';
import { INFERENCE_MAX_RETRIES } from '../runtime/inference-config';

@Injectable()
export class StackitInferenceHandler extends ThinkingTagInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
  }

  protected createProvider(model: Model): ModelProvider {
    return openai({
      apiKey: this.configService.get<string>('models.stackit.apiKey') ?? '',
      baseUrl: this.configService.get<string>('models.stackit.baseURL'),
      model: model.name,
      maxRetries: INFERENCE_MAX_RETRIES,
    });
  }
}
