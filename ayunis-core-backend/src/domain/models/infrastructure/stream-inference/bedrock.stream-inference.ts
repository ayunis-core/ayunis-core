import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { BaseAnthropicStreamInferenceHandler } from './base-anthropic.stream-inference';
import { createBedrockClient } from '../helpers/bedrock-client-options.helper';

@Injectable()
export class BedrockStreamInferenceHandler extends BaseAnthropicStreamInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
    this.client = createBedrockClient(this.configService);
  }
}
