import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { BaseAnthropicInferenceHandler } from './base-anthropic.inference';
import { createBedrockClient } from '../helpers/bedrock-client-options.helper';

@Injectable()
export class BedrockInferenceHandler extends BaseAnthropicInferenceHandler {
  constructor(
    private readonly configService: ConfigService,
    imageContentService: ImageContentService,
  ) {
    super(imageContentService);
    this.client = createBedrockClient(this.configService);
  }
}
