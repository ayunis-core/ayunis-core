import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { bedrock } from '@ayunis/provider-anthropic/bedrock';
import type { ModelProvider } from '@ayunis/inference';
import { RuntimeInferenceProviderFactory } from 'src/domain/models/infrastructure/runtime/runtime-inference-provider.factory';
import type { Model } from 'src/domain/models/domain/model.entity';
import {
  CLAUDE_MAX_OUTPUT_TOKENS,
  PROVIDER_SDK_MAX_RETRIES,
} from 'src/domain/models/infrastructure/runtime/inference-config';

@Injectable()
export class BedrockInferenceProviderFactory extends RuntimeInferenceProviderFactory {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  protected createProvider(model: Model): ModelProvider {
    return bedrock({
      model: model.name,
      maxRetries: PROVIDER_SDK_MAX_RETRIES,
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
