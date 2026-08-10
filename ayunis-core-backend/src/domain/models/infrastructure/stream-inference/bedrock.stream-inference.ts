import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { bedrock } from '@ayunis/provider-anthropic/bedrock';
import type { ModelProvider } from '@ayunis/inference';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { RuntimeStreamInferenceHandler } from '../runtime/runtime-stream-inference.handler';
import type { Model } from '../../domain/model.entity';
import {
  CLAUDE_MAX_OUTPUT_TOKENS,
  INFERENCE_MAX_RETRIES,
} from '../runtime/inference-config';

@Injectable()
export class BedrockStreamInferenceHandler extends RuntimeStreamInferenceHandler {
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
      maxTokens: CLAUDE_MAX_OUTPUT_TOKENS,
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
