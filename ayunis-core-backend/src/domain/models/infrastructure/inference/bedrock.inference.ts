import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { bedrock } from '@ayunis/provider-anthropic/bedrock';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { RuntimeInferenceHandler } from '../runtime/runtime-inference.handler';
import type { Model } from '../../domain/model.entity';
import { INFERENCE_MAX_RETRIES } from '../runtime/inference-config';

@Injectable()
export class BedrockInferenceHandler extends RuntimeInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
  }

  protected createProvider(model: Model): ModelProvider {
    return bedrock({
      model: model.name,
      maxRetries: INFERENCE_MAX_RETRIES,
      awsRegion: this.configService.get<string>('models.bedrock.awsRegion'),
      awsAccessKey: this.configService.get<string>(
        'models.bedrock.awsAccessKeyId',
      ),
      awsSecretKey: this.configService.get<string>(
        'models.bedrock.awsSecretAccessKey',
      ),
    });
  }
}
