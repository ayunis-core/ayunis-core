import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { azure } from '@ayunis/provider-openai';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { RuntimeStreamInferenceHandler } from 'src/domain/models/infrastructure/runtime/runtime-stream-inference.handler';
import type { Model } from 'src/domain/models/domain/model.entity';
import { INFERENCE_MAX_RETRIES } from 'src/domain/models/infrastructure/runtime/inference-config';

@Injectable()
export class AzureStreamInferenceHandler extends RuntimeStreamInferenceHandler {
  constructor(
    @InjectPinoLogger('RuntimeStreamInferenceHandler')
    logger: PinoLogger,

    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(logger, imageContentService);
  }

  protected createProvider(model: Model): ModelProvider {
    return azure({
      apiKey: this.configService.get<string>('models.azure.apiKey') ?? '',
      endpoint: this.configService.get<string>('models.azure.endpoint') ?? '',
      model: model.name,
      maxRetries: INFERENCE_MAX_RETRIES,
    });
  }
}
