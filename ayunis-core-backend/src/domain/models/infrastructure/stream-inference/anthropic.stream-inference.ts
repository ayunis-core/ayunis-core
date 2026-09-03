import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { anthropic } from '@ayunis/provider-anthropic';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { RuntimeStreamInferenceHandler } from 'src/domain/models/infrastructure/runtime/runtime-stream-inference.handler';
import type { Model } from 'src/domain/models/domain/model.entity';
import {
  CLAUDE_MAX_OUTPUT_TOKENS,
  INFERENCE_MAX_RETRIES,
} from 'src/domain/models/infrastructure/runtime/inference-config';

@Injectable()
export class AnthropicStreamInferenceHandler extends RuntimeStreamInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
  }

  protected createProvider(model: Model): ModelProvider {
    return anthropic({
      apiKey: this.configService.get<string>('models.anthropic.apiKey') ?? '',
      model: model.name,
      maxRetries: INFERENCE_MAX_RETRIES,
      maxTokens: CLAUDE_MAX_OUTPUT_TOKENS,
    });
  }
}
