import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ollama } from '@ayunis/provider-ollama';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ThinkingTagInferenceHandler } from 'src/domain/models/infrastructure/runtime/thinking-tag-inference.handler';
import type { Model } from 'src/domain/models/domain/model.entity';
import { INFERENCE_MAX_RETRIES } from 'src/domain/models/infrastructure/runtime/inference-config';
import { ollamaContextWindow } from 'src/domain/models/infrastructure/runtime/ollama-context-window';

@Injectable()
export class LocalOllamaInferenceHandler extends ThinkingTagInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
  }

  protected createProvider(model: Model): ModelProvider {
    return ollama({
      baseUrl: this.configService.get<string>('models.ollama.baseURL') ?? '',
      model: model.name,
      numCtx: ollamaContextWindow(model),
      maxRetries: INFERENCE_MAX_RETRIES,
    });
  }
}
