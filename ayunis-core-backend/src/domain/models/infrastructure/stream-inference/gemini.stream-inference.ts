import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { gemini } from '@ayunis/provider-gemini';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { RuntimeStreamInferenceHandler } from '../runtime/runtime-stream-inference.handler';
import type { Model } from '../../domain/model.entity';
import { INFERENCE_MAX_RETRIES } from '../runtime/inference-config';

@Injectable()
export class GeminiStreamInferenceHandler extends RuntimeStreamInferenceHandler {
  constructor(
    @InjectPinoLogger('RuntimeStreamInferenceHandler')
    logger: PinoLogger,

    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(logger, imageContentService);
  }

  protected createProvider(model: Model): ModelProvider {
    return gemini({
      apiKey: this.configService.get<string>('models.gemini.apiKey') ?? '',
      model: model.name,
      maxRetries: INFERENCE_MAX_RETRIES,
    });
  }
}
